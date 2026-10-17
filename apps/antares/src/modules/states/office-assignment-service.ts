import { eq, desc, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { stateOfficeAssignments, stateOfficeAssignmentApprovals, users } from '../../db/schema';
import { DomainError, HTTP } from '../errors';
import {
  assignmentState,
  assignmentContext,
  assertPendingAssignment,
  assertAssignmentTarget,
} from './office-assignment-context';
import type { AssignmentRecord } from './office-assignment-context';
import { assignmentRequirements } from './office-assignment-domain';
import { assignmentDetail } from './office-assignment-detail';
import { createAssignmentVotes } from './office-assignment-votes';
import { assignmentAudit, applyAssignment, cancelAssignment } from './office-assignment-store';
import type {
  OfficeAssignmentActor,
  OfficeAssignmentInput,
  OfficeAssignmentDetail,
} from './office-assignment-contracts';

const LIST_LIMIT = 50;
class OfficeAssignmentService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async list(stateId: string, actor: OfficeAssignmentActor): Promise<string[]> {
    return await this.db.transaction(async (transaction) => {
      await assignmentState(transaction, stateId, actor);
      const rows = await transaction
        .select({ id: stateOfficeAssignments.id })
        .from(stateOfficeAssignments)
        .where(eq(stateOfficeAssignments.stateId, stateId))
        .orderBy(desc(stateOfficeAssignments.createdAt), desc(stateOfficeAssignments.id))
        .limit(LIST_LIMIT);
      return rows.map((row) => row.id);
    });
  }
  // oxlint-disable-next-line max-lines-per-function -- Proposal creation pins state/office rules and publishes every required generic vote atomically.
  public async create(
    stateId: string,
    actor: OfficeAssignmentActor,
    input: OfficeAssignmentInput,
  ): Promise<string> {
    // oxlint-disable-next-line max-lines-per-function -- The immutable proposal and its vote references must commit together.
    return await this.db.transaction(async (transaction) => {
      const state = await assignmentState(transaction, stateId, actor);
      if (state.status !== 'ACTIVE') {
        throw new DomainError(HTTP.conflict, 'STATE_INACTIVE', 'Государство не активно');
      }
      const office = state.configuration.governance.offices.find(
        (item) => item.id === input.officeId,
      );
      if (office === undefined) {
        throw new DomainError(
          HTTP.badRequest,
          'OFFICE_NOT_FOUND',
          'Должность не входит в устройство этого государства',
        );
      }
      if (
        (input.kind === 'REMOVE' && input.replacedUserId !== null) ||
        input.userId === input.replacedUserId
      ) {
        throw new DomainError(
          HTTP.badRequest,
          'INVALID_REPLACEMENT',
          'Некорректная замена должностного лица',
        );
      }
      const record: AssignmentRecord = {
        id: crypto.randomUUID(),
        stateId,
        governanceRevisionId: state.governanceRevisionId,
        officeId: office.id,
        userId: input.userId,
        kind: input.kind,
        replacedUserId: input.replacedUserId,
        wasVacant: !state.holders.some((holder) => holder.officeId === office.id),
        createdBy: actor.id,
        status: 'PENDING',
        createdAt: new Date(),
        appliedAt: null,
      };
      await assertAssignmentTarget(transaction, { record, state, office });
      const requirements = assignmentRequirements(office, state.configuration.governance, {
        stateId,
        kind: record.kind,
        wasVacant: record.wasVacant,
        replacedUserId: record.replacedUserId,
      });
      const [person] = await transaction
        .select({ name: users.username })
        .from(users)
        .where(eq(users.id, record.userId));
      if (!person) {
        throw new Error('Nominee missing');
      }
      await transaction.insert(stateOfficeAssignments).values(record);
      await createAssignmentVotes(transaction, {
        record,
        office,
        personName: person.name,
        requirements: requirements.votes,
      });
      await assignmentAudit(transaction, record, {
        actorId: actor.id,
        action: 'state.office_assignment.created',
      });
      return record.id;
    });
  }
  public async detail(id: string, actor: OfficeAssignmentActor): Promise<OfficeAssignmentDetail> {
    return await this.db.transaction(
      async (transaction) =>
        await assignmentDetail(transaction, await assignmentContext(transaction, id, actor), actor),
    );
  }
  public async approve(id: string, actor: OfficeAssignmentActor, officeId: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      const context = await assignmentContext(transaction, id, actor);
      assertPendingAssignment(context);
      const allowed = context.requirements.approvalGroups.some((group) =>
        group.officeIds.includes(officeId),
      );
      const held = context.state.holders.some(
        (holder) => holder.officeId === officeId && holder.userId === actor.id,
      );
      if (!allowed || !held) {
        throw new DomainError(
          HTTP.forbidden,
          'OFFICE_NOT_AUTHORIZED',
          'Должность не позволяет одобрить это решение',
        );
      }
      await transaction
        .insert(stateOfficeAssignmentApprovals)
        .values({ assignmentId: id, actorId: actor.id, officeId })
        .onConflictDoUpdate({
          target: [
            stateOfficeAssignmentApprovals.assignmentId,
            stateOfficeAssignmentApprovals.officeId,
            stateOfficeAssignmentApprovals.actorId,
          ],
          set: { approvedAt: sql`transaction_timestamp()` },
        });
      await assignmentAudit(transaction, context.record, {
        actorId: actor.id,
        action: 'state.office_assignment.approved',
      });
    });
  }
  public async apply(id: string, actor: OfficeAssignmentActor, reason?: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      const context = await assignmentContext(transaction, id, actor);
      assertPendingAssignment(context);
      await assertAssignmentTarget(transaction, context);
      const detail = await assignmentDetail(transaction, context, actor);
      if (!detail.canApply || (detail.manualRequired && (reason ?? '').trim() === '')) {
        throw new DomainError(
          HTTP.forbidden,
          'DECISION_NOT_APPROVED',
          'Требуются действующие одобрения, завершённое успешное голосование и предусмотренная ручная проверка с причиной',
        );
      }
      await applyAssignment(transaction, context, { actorId: actor.id, reason });
    });
  }
  public async cancel(id: string, actor: OfficeAssignmentActor): Promise<void> {
    await this.db.transaction(async (transaction) => {
      const context = await assignmentContext(transaction, id, actor);
      if (
        context.record.status !== 'PENDING' ||
        (actor.id !== context.record.createdBy && !actor.admin)
      ) {
        throw new DomainError(
          HTTP.forbidden,
          'CANNOT_CANCEL_ASSIGNMENT',
          'Отменить предложение может его автор или администрация до выполнения',
        );
      }
      await cancelAssignment(transaction, context.record, actor.id);
    });
  }
}
export { OfficeAssignmentService };
