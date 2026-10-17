import { eq } from 'drizzle-orm';
import { stateOfficeAssignments, users } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { authorizeMutation } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { readStateDetail } from './reader';
import { readRevision } from './revisions';
import type { StateDetail, Office, StateConfiguration } from './contracts';
import type { OfficeAssignmentActor, OfficeAssignmentDetail } from './office-assignment-contracts';
import { assignmentRequirements } from './office-assignment-domain';
import type { AssignmentRequirements } from './office-assignment-domain';

type AssignmentRecord = typeof stateOfficeAssignments.$inferSelect;
interface AssignmentContext {
  readonly record: AssignmentRecord;
  readonly state: StateDetail;
  readonly office: Office;
  readonly requirements: AssignmentRequirements;
  readonly stale: boolean;
  readonly manualProcedures: OfficeAssignmentDetail['manualProcedures'];
}
async function assignmentState(
  transaction: Transaction,
  stateId: string,
  actor: OfficeAssignmentActor,
): Promise<StateDetail> {
  if (actor.admin) {
    await authorizeMutation(transaction, actor.id, 'states.manage');
  }
  const [user] = await transaction
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, actor.id));
  if (user?.status !== 'ACTIVE') {
    throw new DomainError(HTTP.forbidden, 'ACTOR_INACTIVE', 'Аккаунт недоступен');
  }
  const state = await readStateDetail(transaction, {
    id: stateId,
    locale: 'en',
    access: { actorId: actor.id, admin: actor.admin },
  });
  if (!actor.admin && !state.citizens.some((citizen) => citizen.id === actor.id)) {
    throw new DomainError(
      HTTP.forbidden,
      'CITIZEN_REQUIRED',
      'Требуется действующее гражданство государства',
    );
  }
  return state;
}
async function assignmentRecord(
  transaction: Transaction,
  id: string,
  lock = false,
): Promise<AssignmentRecord> {
  const query = transaction
    .select()
    .from(stateOfficeAssignments)
    .where(eq(stateOfficeAssignments.id, id));
  const rows = lock ? await query.for('update') : await query;
  const [record] = rows;
  if (record === undefined) {
    throw new DomainError(
      HTTP.notFound,
      'ASSIGNMENT_NOT_FOUND',
      'Предложение о должности не найдено',
    );
  }
  return record;
}
async function pinnedConfiguration(
  transaction: Transaction,
  record: AssignmentRecord,
  state: StateDetail,
): Promise<StateConfiguration> {
  if (record.governanceRevisionId === state.governanceRevisionId) {
    return state.configuration;
  }
  const pinned = await readRevision(transaction, record.governanceRevisionId);
  return pinned.configuration;
}
async function assignmentContext(
  transaction: Transaction,
  id: string,
  actor: OfficeAssignmentActor,
): Promise<AssignmentContext> {
  const initial = await assignmentRecord(transaction, id);
  const state = await assignmentState(transaction, initial.stateId, actor);
  const record = await assignmentRecord(transaction, id, true);
  const pinned = await pinnedConfiguration(transaction, record, state);
  const office = pinned.governance.offices.find((item) => item.id === record.officeId);
  if (office === undefined) {
    throw new Error('Pinned office missing');
  }
  const vacant = !state.holders.some((holder) => holder.officeId === record.officeId);
  const stale =
    state.status !== 'ACTIVE' ||
    state.governanceRevisionId !== record.governanceRevisionId ||
    (record.kind === 'APPOINT' && vacant !== record.wasVacant);
  return {
    record,
    state,
    office,
    stale,
    manualProcedures: pinned.governance.policies
      .filter(
        (policy) =>
          policy.mechanism === 'MANUAL' &&
          (policy.action ===
            (record.kind === 'APPOINT' ? 'APPOINT_OFFICE_HOLDER' : 'REMOVE_OFFICE_HOLDER') ||
            (record.replacedUserId !== null && policy.action === 'REMOVE_OFFICE_HOLDER')),
      )
      .map((policy) => policy.manualProcedure),
    requirements: assignmentRequirements(office, pinned.governance, {
      stateId: state.id,
      kind: record.kind,
      wasVacant: record.wasVacant,
      replacedUserId: record.replacedUserId,
    }),
  };
}
function assertPendingAssignment(context: AssignmentContext): void {
  if (context.record.status !== 'PENDING') {
    throw new DomainError(HTTP.conflict, 'ASSIGNMENT_FINISHED', 'Предложение уже завершено');
  }
  if (context.stale) {
    throw new DomainError(
      HTTP.conflict,
      'ASSIGNMENT_STALE',
      'Устройство или состав должности изменились. Подготовьте новое предложение',
    );
  }
}
async function assertActiveCandidate(
  transaction: Transaction,
  state: StateDetail,
  userId: string,
): Promise<void> {
  const [user] = await transaction
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, userId));
  if (user?.status !== 'ACTIVE' || !state.citizens.some((citizen) => citizen.id === userId)) {
    throw new DomainError(
      HTTP.badRequest,
      'CANDIDATE_UNAVAILABLE',
      'Назначаемый игрок должен быть действующим гражданином с активным аккаунтом',
    );
  }
}
async function assertAssignmentTarget(
  transaction: Transaction,
  context: Pick<AssignmentContext, 'record' | 'state' | 'office'>,
): Promise<void> {
  const { record, state, office } = context;
  const holders = state.holders.filter((holder) => holder.officeId === office.id);
  if (record.kind === 'REMOVE') {
    if (
      !holders.some((holder) => holder.userId === record.userId) ||
      (office.required && holders.length <= 1)
    ) {
      throw new DomainError(
        HTTP.conflict,
        'SUCCESSOR_REQUIRED',
        'Держатель отсутствует или требуется назначить преемника на обязательную должность',
      );
    }
    return;
  }
  await assertActiveCandidate(transaction, state, record.userId);
  if (holders.some((holder) => holder.userId === record.userId)) {
    throw new DomainError(HTTP.conflict, 'ALREADY_HOLDER', 'Игрок уже занимает эту должность');
  }
  if (
    record.replacedUserId !== null &&
    !holders.some((holder) => holder.userId === record.replacedUserId)
  ) {
    throw new DomainError(
      HTTP.conflict,
      'REPLACEMENT_STALE',
      'Заменяемый должностной человек больше не занимает должность',
    );
  }
  const remaining = holders.filter((holder) => holder.userId !== record.replacedUserId);
  if (remaining.length >= office.maxHolders) {
    throw new DomainError(
      HTTP.conflict,
      'OFFICE_FULL',
      'Свободных мест нет. Укажите заменяемого должностного человека',
    );
  }
}
export {
  assignmentState,
  assignmentContext,
  assertPendingAssignment,
  assertAssignmentTarget,
  type AssignmentContext,
  type AssignmentRecord,
};
