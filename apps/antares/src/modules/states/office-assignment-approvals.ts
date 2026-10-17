import { and, eq, isNull, lte } from 'drizzle-orm';
import { stateOfficeAssignmentApprovals, stateOfficeHolders, users } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { holderHasAuthority } from './office-authority';
import type { AssignmentContext } from './office-assignment-context';
import type { OfficeAssignmentDetail } from './office-assignment-contracts';

// oxlint-disable-next-line max-lines-per-function -- Approval history and exact PostgreSQL holder intervals form one evidence read.
async function assignmentApprovals(
  transaction: Transaction,
  context: AssignmentContext,
): Promise<OfficeAssignmentDetail['approvals']> {
  const rows = await transaction
    .select({
      officeId: stateOfficeAssignmentApprovals.officeId,
      actorId: users.id,
      name: users.username,
    })
    .from(stateOfficeAssignmentApprovals)
    .innerJoin(users, eq(users.id, stateOfficeAssignmentApprovals.actorId))
    .where(eq(stateOfficeAssignmentApprovals.assignmentId, context.record.id));
  const serving = await transaction
    .select({
      officeId: stateOfficeHolders.officeId,
      actorId: stateOfficeHolders.userId,
      since: stateOfficeHolders.since,
    })
    .from(stateOfficeAssignmentApprovals)
    .innerJoin(
      stateOfficeHolders,
      and(
        eq(stateOfficeHolders.officeId, stateOfficeAssignmentApprovals.officeId),
        eq(stateOfficeHolders.userId, stateOfficeAssignmentApprovals.actorId),
      ),
    )
    .innerJoin(users, eq(users.id, stateOfficeHolders.userId))
    .where(
      and(
        eq(stateOfficeAssignmentApprovals.assignmentId, context.record.id),
        isNull(stateOfficeHolders.until),
        lte(stateOfficeHolders.since, stateOfficeAssignmentApprovals.approvedAt),
        eq(users.status, 'ACTIVE'),
      ),
    );
  const now = new Date();
  return rows.map((row) => ({
    officeId: row.officeId,
    actor: { id: row.actorId, name: row.name },
    current: serving.some((holder) => {
      const office = context.state.configuration.governance.offices.find(
        (item) => item.id === holder.officeId,
      );
      return (
        holder.officeId === row.officeId &&
        holder.actorId === row.actorId &&
        office !== undefined &&
        holderHasAuthority(office, holder.since, now)
      );
    }),
  }));
}
export { assignmentApprovals };
