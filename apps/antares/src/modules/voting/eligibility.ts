import { holderHasAuthority } from '../states/office-authority';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import {
  users,
  stateMemberships,
  stateOfficeHolders,
  stateOffices,
  states,
  stateGovernanceRevisions,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import type { VotingInput } from './contracts';

type Electorate = VotingInput['electorate'];
type OrdinaryElectorate = Exclude<Electorate, { companyId: string }>;
async function assertElectorateAvailable(
  transaction: Transaction,
  electorate: Readonly<OrdinaryElectorate>,
): Promise<void> {
  if (electorate.type === 'GLOBAL_USERS' || electorate.type === 'SPECIFIC_USERS') {
    return;
  }
  const [state] = await transaction.select().from(states).where(eq(states.id, electorate.stateId));
  if (state?.status !== 'ACTIVE') {
    throw new DomainError(HTTP.conflict, 'STATE_INACTIVE', 'Государство не активно');
  }
  if (electorate.type === 'OFFICE_HOLDERS') {
    const offices = await transaction
      .select({ id: stateOffices.id })
      .from(stateOffices)
      .where(
        and(
          eq(stateOffices.stateId, electorate.stateId),
          inArray(stateOffices.id, electorate.officeIds),
        ),
      );
    if (offices.length !== new Set(electorate.officeIds).size) {
      throw new DomainError(
        HTTP.badRequest,
        'UNKNOWN_OFFICE',
        'Должность не принадлежит государству',
      );
    }
  }
}
// oxlint-disable-next-line max-lines-per-function -- Explicit electorate adapters snapshot identities in the opening transaction.
async function eligibleUsers(
  transaction: Transaction,
  electorate: Readonly<OrdinaryElectorate>,
): Promise<string[]> {
  await assertElectorateAvailable(transaction, electorate);
  if (electorate.type === 'GLOBAL_USERS' || electorate.type === 'SPECIFIC_USERS') {
    const rows = await transaction
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.status, 'ACTIVE'),
          electorate.type === 'SPECIFIC_USERS' ? inArray(users.id, electorate.userIds) : undefined,
        ),
      )
      .orderBy(asc(users.id));
    return rows.map((row) => row.id);
  }
  if (electorate.type === 'STATE_CITIZENS') {
    const rows = await transaction
      .select({ id: users.id })
      .from(stateMemberships)
      .innerJoin(users, eq(users.id, stateMemberships.userId))
      .where(
        and(
          eq(stateMemberships.stateId, electorate.stateId),
          isNull(stateMemberships.endedAt),
          eq(users.status, 'ACTIVE'),
        ),
      )
      .orderBy(asc(users.id));
    return rows.map((row) => row.id);
  }
  const rows = await transaction
    .select({
      id: users.id,
      officeId: stateOfficeHolders.officeId,
      since: stateOfficeHolders.since,
    })
    .from(stateOfficeHolders)
    .innerJoin(stateOffices, eq(stateOffices.id, stateOfficeHolders.officeId))
    .innerJoin(users, eq(users.id, stateOfficeHolders.userId))
    .where(
      and(
        eq(stateOffices.stateId, electorate.stateId),
        inArray(stateOffices.id, electorate.officeIds),
        isNull(stateOfficeHolders.until),
        eq(users.status, 'ACTIVE'),
      ),
    )
    .orderBy(asc(users.id));
  const [state] = await transaction.select().from(states).where(eq(states.id, electorate.stateId));
  if (state?.currentRevisionId === null || state?.currentRevisionId === undefined) {
    throw new DomainError(
      HTTP.conflict,
      'GOVERNANCE_UNAVAILABLE',
      'Государственное устройство недоступно',
    );
  }
  const [revision] = await transaction
    .select()
    .from(stateGovernanceRevisions)
    .where(eq(stateGovernanceRevisions.id, state.currentRevisionId));
  const eligible = rows.filter((row) => {
    const office = revision?.configuration.governance.offices.find(
      (item) => item.id === row.officeId,
    );
    return office !== undefined && holderHasAuthority(office, row.since, new Date());
  });
  return [...new Set(eligible.map((row) => row.id))];
}
export { eligibleUsers, assertElectorateAvailable, type OrdinaryElectorate };
