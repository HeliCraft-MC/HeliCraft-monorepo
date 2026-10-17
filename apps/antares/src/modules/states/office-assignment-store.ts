import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  adminAuditLog,
  stateOfficeHolders,
  stateOfficeAssignments,
  stateOfficeAssignmentVotes,
  votings,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { holderHasAuthority } from './office-authority';
import type { AssignmentContext, AssignmentRecord } from './office-assignment-context';

async function assignmentAudit(
  transaction: Transaction,
  record: AssignmentRecord,
  entry: Readonly<{ actorId: string; action: string; reason?: string }>,
): Promise<void> {
  await transaction.insert(adminAuditLog).values({
    actorId: entry.actorId,
    targetId: record.id,
    targetType: 'STATE_OFFICE_ASSIGNMENT',
    action: entry.action,
    metadata: {
      stateId: record.stateId,
      officeId: record.officeId,
      userId: record.userId,
      replacedUserId: record.replacedUserId ?? '',
      kind: record.kind,
      reason: entry.reason ?? '',
    },
  });
}
async function applyAssignment(
  transaction: Transaction,
  context: AssignmentContext,
  entry: Readonly<{ actorId: string; reason?: string }>,
): Promise<void> {
  const { record, office } = context;
  const rows = await transaction
    .select()
    .from(stateOfficeHolders)
    .where(and(eq(stateOfficeHolders.officeId, office.id), isNull(stateOfficeHolders.until)));
  const now = new Date();
  const closed = rows.filter(
    (row) =>
      !holderHasAuthority(office, row.since, now) ||
      (record.kind === 'REMOVE' && row.userId === record.userId) ||
      row.userId === record.replacedUserId,
  );
  if (closed.length > 0) {
    await transaction
      .update(stateOfficeHolders)
      .set({ until: sql`transaction_timestamp()` })
      .where(
        and(
          eq(stateOfficeHolders.officeId, office.id),
          inArray(
            stateOfficeHolders.userId,
            closed.map((row) => row.userId),
          ),
          isNull(stateOfficeHolders.until),
        ),
      );
  }
  if (record.kind === 'APPOINT') {
    await transaction
      .insert(stateOfficeHolders)
      .values({ officeId: office.id, userId: record.userId, since: sql`transaction_timestamp()` });
  }
  await transaction
    .update(stateOfficeAssignments)
    .set({ status: 'APPLIED', appliedAt: sql`transaction_timestamp()` })
    .where(eq(stateOfficeAssignments.id, record.id));
  await assignmentAudit(transaction, record, {
    actorId: entry.actorId,
    action: 'state.office_assignment.applied',
    reason: entry.reason,
  });
}
async function cancelAssignment(
  transaction: Transaction,
  record: AssignmentRecord,
  actorId: string,
): Promise<void> {
  const links = await transaction
    .select()
    .from(stateOfficeAssignmentVotes)
    .where(eq(stateOfficeAssignmentVotes.assignmentId, record.id));
  if (links.length > 0) {
    await transaction
      .update(votings)
      .set({ status: 'CANCELLED' })
      .where(
        and(
          inArray(
            votings.id,
            links.map((link) => link.votingId),
          ),
          inArray(votings.status, ['DRAFT', 'SCHEDULED', 'OPEN']),
        ),
      );
  }
  await transaction
    .update(stateOfficeAssignments)
    .set({ status: 'CANCELLED' })
    .where(eq(stateOfficeAssignments.id, record.id));
  await assignmentAudit(transaction, record, {
    actorId,
    action: 'state.office_assignment.cancelled',
  });
}
export { assignmentAudit, applyAssignment, cancelAssignment };
