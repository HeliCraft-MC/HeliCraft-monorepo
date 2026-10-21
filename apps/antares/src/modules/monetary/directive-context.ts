import type { TreatyContent } from '../diplomacy/contracts';
import { treatyRevision } from '../diplomacy/store';
import type { Transaction } from '../permissions/transaction';
import type { DirectiveRecord } from './store';
import type { DirectiveDetail, DirectivePayload, MonetaryActor } from './contracts';
import { executionProblem } from './availability';
import { monetaryError } from './domain';
import { policyActor } from './evidence';
import { directiveProofs } from './directive-proofs';
import { fxDecisionDisplay } from '../fx/decision-display';

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
async function directiveContext(
  transaction: Transaction,
  id: string,
  actor: MonetaryActor,
): Promise<{ record: DirectiveRecord; detail: DirectiveDetail }> {
  const { record, state, payload, policy, stale, approvals, votes, requirements, ready } =
    await directiveProofs(transaction, id, actor);
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
      fxDisplay: await fxDecisionDisplay(transaction, record.stateId, payload),
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
