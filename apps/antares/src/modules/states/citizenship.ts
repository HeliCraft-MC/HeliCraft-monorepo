import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { stateMemberships, stateOfficeHolders } from '../../db/schema';
import { DomainError, HTTP } from '../errors';
import { audit, stateRecord } from './persistence';
import { readRevision } from './revisions';
import { holderHasAuthority } from './office-authority';

// oxlint-disable-next-line max-lines-per-function -- Voluntary departure locks the state, checks all serving appointments and closes membership atomically.
async function leaveState(db: Database['db'], stateId: string, actorId: string): Promise<void> {
  // oxlint-disable-next-line max-lines-per-function -- Office checks and membership closure must share the locked transaction.
  await db.transaction(async (transaction) => {
    const state = await stateRecord(transaction, stateId);
    if (!['ACTIVE', 'SUSPENDED'].includes(state.status) || state.currentRevisionId === null) {
      throw new DomainError(
        HTTP.conflict,
        'STATE_INACTIVE',
        'Выход из этого государства сейчас недоступен',
      );
    }
    const [membership] = await transaction
      .select()
      .from(stateMemberships)
      .where(
        and(
          eq(stateMemberships.stateId, stateId),
          eq(stateMemberships.userId, actorId),
          isNull(stateMemberships.endedAt),
        ),
      )
      .for('update');
    if (!membership) {
      throw new DomainError(
        HTTP.notFound,
        'CITIZENSHIP_NOT_FOUND',
        'У вас нет действующего гражданства этого государства',
      );
    }
    const { configuration } = await readRevision(transaction, state.currentRevisionId);
    const officeIds = configuration.governance.offices.map((office) => office.id);
    const holders =
      officeIds.length === 0
        ? []
        : await transaction
            .select()
            .from(stateOfficeHolders)
            .where(
              and(
                inArray(stateOfficeHolders.officeId, officeIds),
                isNull(stateOfficeHolders.until),
              ),
            );
    const now = new Date();
    const holdsOffice = configuration.governance.offices.some((office) =>
      holders.some(
        (holder) =>
          holder.officeId === office.id &&
          holder.userId === actorId &&
          holderHasAuthority(office, holder.since, now),
      ),
    );
    if (holdsOffice) {
      throw new DomainError(
        HTTP.conflict,
        'OFFICE_HOLDER_CANNOT_LEAVE',
        'Сначала освободите все занимаемые должности по действующей процедуре, затем покиньте государство',
      );
    }
    await transaction
      .update(stateMemberships)
      .set({ endedAt: sql`transaction_timestamp()` })
      .where(
        and(
          eq(stateMemberships.stateId, stateId),
          eq(stateMemberships.userId, actorId),
          isNull(stateMemberships.endedAt),
        ),
      );
    // Serving appointments were rejected above. Close any expired intervals so later term reforms cannot revive them.
    if (officeIds.length > 0) {
      await transaction
        .update(stateOfficeHolders)
        .set({ until: sql`transaction_timestamp()` })
        .where(
          and(
            inArray(stateOfficeHolders.officeId, officeIds),
            eq(stateOfficeHolders.userId, actorId),
            isNull(stateOfficeHolders.until),
          ),
        );
    }
    await audit(transaction, {
      actorId,
      targetId: stateId,
      action: 'state.citizenship.left',
      reason: 'Voluntary departure',
    });
  });
}
export { leaveState };
