import { and, eq, isNull } from 'drizzle-orm';
import { stateRecord } from '../states/persistence';
import { stateMemberships, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { TaxEvidence, TaxRule } from './contracts';

async function jurisdictionMemberships(
  transaction: Transaction,
  taxpayerId: string,
): Promise<{ joinedAt: Date; stateId: string }[]> {
  const candidates = await transaction
    .select({ stateId: stateMemberships.stateId })
    .from(stateMemberships)
    .where(and(eq(stateMemberships.userId, taxpayerId), isNull(stateMemberships.endedAt)))
    .orderBy(stateMemberships.stateId);
  for (const candidate of candidates) {
    // oxlint-disable-next-line no-await-in-loop -- State locks serialize membership departure and administrative status with the event snapshot in deterministic order.
    await stateRecord(transaction, candidate.stateId);
  }
  return await transaction
    .select({ joinedAt: stateMemberships.joinedAt, stateId: stateMemberships.stateId })
    .from(stateMemberships)
    .innerJoin(states, eq(states.id, stateMemberships.stateId))
    .where(
      and(
        eq(stateMemberships.userId, taxpayerId),
        isNull(stateMemberships.endedAt),
        eq(states.status, 'ACTIVE'),
      ),
    );
}
function resolveJurisdiction(
  stateId: string,
  rule: TaxRule,
  memberships: readonly { joinedAt: Date; stateId: string }[],
): TaxEvidence[] {
  const membership = memberships.find((item) => item.stateId === stateId);
  if (!membership) {
    return [];
  }
  return rule.jurisdictions
    .filter((basis) => basis === 'CITIZENSHIP' || basis === 'TERRITORIAL')
    .map((basis) => ({
      stateId,
      basis,
      membershipJoinedAt: membership.joinedAt.toISOString(),
      source: basis === 'CITIZENSHIP' ? 'CITIZENSHIP' : 'CITIZENSHIP_PROXY',
    }));
}
export { jurisdictionMemberships, resolveJurisdiction };
