// oxlint-disable no-await-in-loop -- Hydration reads use one repeatable-read transaction connection.
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  users,
  states,
  stateMemberships,
  stateFounders,
  stateOfficeHolders,
} from '../../db/schema';
import { DomainError, HTTP } from '../errors';
import type { Transaction } from '../permissions/transaction';
import { readRevision } from '../states/revisions';
import { holderHasAuthority } from '../states/office-authority';
import type { PublicPlayerProfile } from './profile-contracts';

async function affiliationRecords(
  transaction: Transaction,
  id: string,
): Promise<{ id: string; slug: string; revisionId: string | null; citizenSince: Date | null }[]> {
  return await transaction
    .select({
      id: states.id,
      slug: states.slug,
      revisionId: states.currentRevisionId,
      citizenSince: stateMemberships.joinedAt,
    })
    .from(states)
    .leftJoin(
      stateMemberships,
      and(
        eq(stateMemberships.stateId, states.id),
        eq(stateMemberships.userId, id),
        isNull(stateMemberships.endedAt),
      ),
    )
    .where(
      and(
        eq(states.status, 'ACTIVE'),
        sql`(${stateMemberships.userId} is not null or exists (select 1 from ${stateFounders} where ${stateFounders.stateId} = ${states.id} and ${stateFounders.userId} = ${id}))`,
      ),
    )
    .orderBy(asc(states.slug));
}
async function affiliations(
  transaction: Transaction,
  id: string,
): Promise<PublicPlayerProfile['states']> {
  const records = await affiliationRecords(transaction, id);
  const holders = await transaction
    .select({ officeId: stateOfficeHolders.officeId, since: stateOfficeHolders.since })
    .from(stateOfficeHolders)
    .where(and(eq(stateOfficeHolders.userId, id), isNull(stateOfficeHolders.until)));
  const founders = await transaction
    .select({ stateId: stateFounders.stateId })
    .from(stateFounders)
    .where(and(eq(stateFounders.userId, id), eq(stateFounders.type, 'PRIMARY')));
  const result: PublicPlayerProfile['states'] = [];
  const now = new Date();
  for (const record of records) {
    if (record.revisionId !== null) {
      const { configuration } = await readRevision(transaction, record.revisionId);
      const founder =
        founders.some((item) => item.stateId === record.id) ||
        configuration.cofounderIds.includes(id);
      if (record.citizenSince !== null || founder) {
        const offices = configuration.governance.offices
          .filter((office) =>
            holders.some(
              (holder) =>
                holder.officeId === office.id && holderHasAuthority(office, holder.since, now),
            ),
          )
          .map((office) => ({
            id: office.id,
            name: office.name,
            isHeadOfState: office.isHeadOfState,
          }));
        result.push({
          id: record.id,
          slug: record.slug,
          name: configuration.name,
          color: configuration.color,
          citizenSince: record.citizenSince?.toISOString() ?? null,
          founder,
          offices,
        });
      }
    }
  }
  return result;
}
async function publicPlayerProfile(db: Database['db'], id: string): Promise<PublicPlayerProfile> {
  return await db.transaction(
    async (transaction) => {
      const [player] = await transaction
        .select({
          id: users.id,
          name: users.username,
          skinId: users.currentSkinId,
          registeredAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, id));
      if (!player) {
        throw new DomainError(HTTP.notFound, 'PLAYER_NOT_FOUND', 'Игрок не найден');
      }
      return {
        ...player,
        registeredAt: player.registeredAt.toISOString(),
        states: await affiliations(transaction, id),
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
export { publicPlayerProfile };
