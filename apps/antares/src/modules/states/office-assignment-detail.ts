import { inArray } from 'drizzle-orm';
import { users } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError } from '../errors';
import { assignmentApprovals } from './office-assignment-approvals';
import { assignmentVotes } from './office-assignment-votes';
import { assignmentApprovalsMet } from './office-assignment-domain';
import { assertAssignmentTarget } from './office-assignment-context';
import type { AssignmentContext } from './office-assignment-context';
import type { OfficeAssignmentActor, OfficeAssignmentDetail } from './office-assignment-contracts';

async function targetProblem(
  transaction: Transaction,
  context: AssignmentContext,
): Promise<string | null> {
  try {
    await assertAssignmentTarget(transaction, context);
    return null;
  } catch (error) {
    if (error instanceof DomainError) {
      return error.message;
    }
    throw error;
  }
}
// oxlint-disable-next-line max-lines-per-function -- The decision read model presents immutable payload, current authority and generic voting evidence together.
async function assignmentDetail(
  transaction: Transaction,
  context: AssignmentContext,
  actor: OfficeAssignmentActor,
): Promise<OfficeAssignmentDetail> {
  const { record, requirements, state, office } = context;
  const ids = [
    record.userId,
    record.createdBy,
    ...(record.replacedUserId === null ? [] : [record.replacedUserId]),
  ];
  const people = await transaction
    .select({ id: users.id, name: users.username })
    .from(users)
    .where(inArray(users.id, ids));
  function person(id: string): { id: string; name: string } {
    const found = people.find((item) => item.id === id);
    if (found === undefined) {
      throw new Error('Office decision person missing');
    }
    return found;
  }
  const approvals = await assignmentApprovals(transaction, context);
  const votes = await assignmentVotes(transaction, record);
  const approvedOffices = new Set(
    approvals.filter((approval) => approval.current).map((approval) => approval.officeId),
  );
  const problem = record.status === 'PENDING' ? await targetProblem(transaction, context) : null;
  const votesMet = requirements.votes.every((requirement) =>
    votes.some((vote) => vote.source === requirement.source && vote.approved),
  );
  const pending = record.status === 'PENDING';
  const ready =
    record.status === 'APPLIED' ||
    (!context.stale &&
      problem === null &&
      assignmentApprovalsMet(requirements.approvalGroups, approvedOffices) &&
      votesMet);
  const requiredOfficeIds = new Set(
    requirements.approvalGroups.flatMap((group) => group.officeIds),
  );
  return {
    id: record.id,
    stateId: record.stateId,
    governanceRevisionId: record.governanceRevisionId,
    kind: record.kind,
    state: {
      id: state.id,
      slug: state.slug,
      name: state.configuration.name,
      color: state.configuration.color,
    },
    office,
    person: person(record.userId),
    replacedPerson: record.replacedUserId === null ? null : person(record.replacedUserId),
    createdBy: person(record.createdBy),
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    stale: pending && context.stale,
    manualRequired: requirements.manual,
    manualProcedures: context.manualProcedures,
    ready,
    canApply: pending && ready && (!requirements.manual || actor.admin),
    canCancel: pending && (actor.admin || actor.id === record.createdBy),
    blockedReason: problem,
    approvalGroups: requirements.approvalGroups,
    approvals,
    votes,
    approvalOffices: state.configuration.governance.offices
      .filter((item) => requiredOfficeIds.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        canApprove:
          pending &&
          !context.stale &&
          state.holders.some((holder) => holder.officeId === item.id && holder.userId === actor.id),
      })),
  };
}
export { assignmentDetail };
