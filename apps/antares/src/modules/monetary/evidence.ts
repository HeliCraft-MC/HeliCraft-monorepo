import { and, eq, isNull, lte } from 'drizzle-orm';
import { monetaryApprovals, stateOfficeHolders, users } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { StateDetail, Policy } from '../states/contracts';
import { policyRequirements, assignmentApprovalsMet } from '../states/office-assignment-domain';
import { holderHasAuthority } from '../states/office-authority';
import type { DirectiveDetail } from './contracts';

function policyActor(state: StateDetail, policy: Policy, actorId: string): boolean {
  const citizen = state.citizens.some((person) => person.id === actorId);
  if (!citizen) {
    return false;
  }
  if (['CITIZEN_VOTE', 'MANUAL'].includes(policy.mechanism)) {
    return true;
  }
  return state.holders.some(
    (holder) => holder.userId === actorId && policy.officeIds.includes(holder.officeId),
  );
}
async function directiveApprovals(
  transaction: Transaction,
  state: StateDetail,
  id: string,
): Promise<DirectiveDetail['approvals']> {
  const rows = await transaction
    .select()
    .from(monetaryApprovals)
    .where(eq(monetaryApprovals.directiveId, id));
  const serving = await transaction
    .select({
      officeId: stateOfficeHolders.officeId,
      actorId: stateOfficeHolders.userId,
      since: stateOfficeHolders.since,
    })
    .from(monetaryApprovals)
    .innerJoin(
      stateOfficeHolders,
      and(
        eq(stateOfficeHolders.officeId, monetaryApprovals.officeId),
        eq(stateOfficeHolders.userId, monetaryApprovals.actorId),
      ),
    )
    .innerJoin(users, eq(users.id, stateOfficeHolders.userId))
    .where(
      and(
        eq(monetaryApprovals.directiveId, id),
        isNull(stateOfficeHolders.until),
        lte(stateOfficeHolders.since, monetaryApprovals.approvedAt),
        eq(users.status, 'ACTIVE'),
      ),
    );
  return rows.map((row) => ({
    officeId: row.officeId,
    actorId: row.actorId,
    current: serving.some((holder) => {
      const office = state.configuration.governance.offices.find(
        (item) => item.id === holder.officeId,
      );
      return (
        row.officeId === holder.officeId &&
        row.actorId === holder.actorId &&
        office !== undefined &&
        holderHasAuthority(office, holder.since, new Date())
      );
    }),
  }));
}
function proofsMet(
  policy: Policy,
  state: StateDetail,
  evidence: Readonly<{ approvals: DirectiveDetail['approvals']; votes: DirectiveDetail['votes'] }>,
): boolean {
  const { approvals, votes } = evidence;
  const requirements = policyRequirements(
    policy,
    state.id,
    state.configuration.governance.votingDefaults,
  );
  return (
    assignmentApprovalsMet(
      requirements.approvalGroups,
      new Set(
        approvals.filter((approval) => approval.current).map((approval) => approval.officeId),
      ),
    ) &&
    (requirements.votes.length === 0 || votes.some((vote) => vote.approved))
  );
}
export { policyActor, directiveApprovals, proofsMet };
