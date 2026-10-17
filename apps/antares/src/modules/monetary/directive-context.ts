// oxlint-disable import/max-dependencies -- The evidence read composes existing State revisions and reusable policy/voting checks.
import type { TreatyContent } from '../diplomacy/contracts';
import { treatyRevision } from '../diplomacy/store';
import { and, eq, isNull, lte, sql } from 'drizzle-orm';
import { monetaryDirectives, users, stateOfficeHolders } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { assignmentState } from '../states/office-assignment-context';
import { policyRequirements } from '../states/office-assignment-domain';
import type { StateDetail, Policy } from '../states/contracts';
import { readRevision } from '../states/revisions';
import { DomainError, HTTP } from '../errors';
import { directiveRecord, hydratePayload, currentPolicy } from './store';
import type { DirectiveRecord } from './store';
import type { DirectiveDetail, DirectivePayload, MonetaryActor } from './contracts';
import { directiveVotes } from './votes';
import { executionProblem } from './availability';
import { DECISION_ACTIONS, monetaryHash, monetaryError } from './domain';
import { policyActor, directiveApprovals, proofsMet } from './evidence';

async function directiveIsStale(
  transaction: Transaction,
  context: Readonly<{
    record: DirectiveRecord;
    state: StateDetail;
    policy: Policy;
    payload: DirectivePayload;
  }>,
): Promise<boolean> {
  const { record, state, policy, payload } = context;
  const [creator] = await transaction
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, record.createdBy));
  // Exact SQL comparison prevents millisecond rounding from reviving an earlier appointment.
  const holderTerms = await transaction
    .select({ officeId: stateOfficeHolders.officeId })
    .from(stateOfficeHolders)
    .where(
      and(
        eq(stateOfficeHolders.userId, record.createdBy),
        isNull(stateOfficeHolders.until),
        lte(
          stateOfficeHolders.since,
          sql`(select ${monetaryDirectives.createdAt} from ${monetaryDirectives} where ${monetaryDirectives.id} = ${record.id})`,
        ),
      ),
    );
  const uninterrupted =
    ['CITIZEN_VOTE', 'MANUAL'].includes(policy.mechanism) ||
    holderTerms.some((holder) => policy.officeIds.includes(holder.officeId));
  const current =
    'currencyId' in payload ? await currentPolicy(transaction, payload.currencyId) : null;
  return (
    state.status !== 'ACTIVE' ||
    state.governanceRevisionId !== record.governanceRevisionId ||
    creator?.status !== 'ACTIVE' ||
    !policyActor(state, policy, record.createdBy) ||
    !uninterrupted ||
    ('amountMinor' in payload && (current?.id ?? null) !== record.policyRevisionId)
  );
}
async function directiveTreatyContent(
  transaction: Transaction,
  payload: DirectivePayload,
): Promise<TreatyContent | null> {
  if (!('treatyId' in payload)) {
    return null;
  }
  const revision = await treatyRevision(transaction, payload.revisionId);
  return revision.content;
}
// oxlint-disable-next-line max-lines-per-function -- The immutable payload and all current proof capabilities form one decision DTO.
async function directiveContext(
  transaction: Transaction,
  id: string,
  actor: MonetaryActor,
): Promise<{ record: DirectiveRecord; detail: DirectiveDetail }> {
  const initial = await directiveRecord(transaction, id);
  const state = await assignmentState(transaction, initial.stateId, actor);
  const record = await directiveRecord(transaction, id);
  const payload = await hydratePayload(transaction, record);
  if (monetaryHash(payload) !== record.payloadHash) {
    monetaryError('DIRECTIVE_INTEGRITY', 'Содержимое распоряжения не совпадает с утверждённым');
  }
  const revision =
    state.governanceRevisionId === record.governanceRevisionId
      ? null
      : await readRevision(transaction, record.governanceRevisionId);
  const pinned = revision?.configuration ?? state.configuration;
  const policy = pinned.governance.policies.find(
    (item) => item.action === DECISION_ACTIONS[payload.kind],
  );
  if (!policy) {
    throw new DomainError(
      HTTP.forbidden,
      'MONETARY_POLICY_MISSING',
      'Полномочие не настроено в Governance',
    );
  }
  const stale = await directiveIsStale(transaction, { record, state, policy, payload });
  const approvals = await directiveApprovals(transaction, state, id);
  const votes = await directiveVotes(transaction, record);
  const requirements = policyRequirements(policy, state.id, pinned.governance.votingDefaults);
  const ready = !stale && proofsMet(policy, state, { approvals, votes });
  const pending = record.status === 'PENDING';
  const problem =
    pending && !stale ? await executionProblem(transaction, record.stateId, payload) : null;
  const required = new Set(requirements.approvalGroups.flatMap((group) => group.officeIds));
  return {
    record,
    detail: {
      id,
      stateId: record.stateId,
      governanceRevisionId: record.governanceRevisionId,
      createdBy: record.createdBy,
      payload,
      payloadHash: record.payloadHash,
      treatyContent: await directiveTreatyContent(transaction, payload),
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      appliedAt: record.appliedAt?.toISOString() ?? null,
      stale,
      ready,
      manualRequired: requirements.manual,
      manualProcedure: policy.manualProcedure,
      executionProblem: problem,
      canApply:
        problem === null &&
        pending &&
        ready &&
        (requirements.manual ? actor.admin : policyActor(state, policy, actor.id)),
      approvableOfficeIds:
        pending && !stale
          ? state.holders
              .filter((holder) => holder.userId === actor.id && required.has(holder.officeId))
              .map((holder) => holder.officeId)
          : [],
      approvalGroups: requirements.approvalGroups,
      approvals,
      votes,
    },
  };
}
function assertPending(detail: DirectiveDetail): void {
  if (detail.status !== 'PENDING' || detail.stale) {
    monetaryError(
      'DIRECTIVE_STALE',
      'Распоряжение завершено или полномочия изменились. Требуется новое согласование',
    );
  }
}
function requireFinancialPayload(
  payload: DirectivePayload,
): asserts payload is Extract<DirectivePayload, { amountMinor: string }> {
  if (!('amountMinor' in payload)) {
    throw new Error('Financial payload required');
  }
}
export { directiveContext, assertPending, requireFinancialPayload };
