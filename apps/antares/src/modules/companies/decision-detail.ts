import type { Transaction } from '../permissions/transaction';
import { DomainError } from '../errors';
import type { CompanyActor } from './decision-contracts';
import type { CompanyDecisionDetail, CompanyDecisionSummary } from './read-contracts';
import type { CompanyProofs } from './decision-proofs';
import type { CompanyDecisionRecord } from './decision-store';
import { actorMayApply } from './decision-commands';
import { assertCompanyAction } from './decision-execution';
import { companyDecisionProofs } from './decision-proofs';
import { assertDecisionReader } from './decision-read-access';
import { decisionFinancialEvidence } from './decision-financial-evidence';

function companyDecisionSummary(record: CompanyDecisionRecord): CompanyDecisionSummary {
  return {
    id: record.id,
    companyId: record.companyId,
    revisionId: record.revisionId,
    kind: record.payload.kind,
    payloadHash: record.payloadHash,
    status: record.status,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
    appliedAt: record.appliedAt?.toISOString() ?? null,
  };
}
async function decisionExecutionProblem(
  transaction: Transaction,
  proof: CompanyProofs,
): Promise<string | null> {
  if (proof.record.status !== 'PENDING' || proof.stale) {
    return null;
  }
  try {
    await assertCompanyAction(transaction, {
      companyId: proof.company.id,
      content: proof.content,
      payload: proof.payload,
    });
    return null;
  } catch (error) {
    if (error instanceof DomainError) {
      return error.message;
    }
    throw error;
  }
}
async function companyDecisionDetail(
  transaction: Transaction,
  input: Readonly<{ proof: CompanyProofs; actor: CompanyActor }>,
): Promise<CompanyDecisionDetail> {
  const { proof, actor } = input;
  const pending = proof.record.status === 'PENDING';
  const executionProblem = await decisionExecutionProblem(transaction, proof);
  const required = new Set(proof.requirements.approvalGroups.flatMap((group) => group.officeIds));
  return {
    ...companyDecisionSummary(proof.record),
    payload: proof.payload,
    calculation: await decisionFinancialEvidence(transaction, proof.payload),
    charter: proof.content.charter,
    appliedBy: proof.record.appliedBy,
    manualReason: proof.record.manualReason,
    stale: proof.stale,
    ready: proof.ready,
    canApply:
      pending &&
      proof.ready &&
      executionProblem === null &&
      (await actorMayApply(transaction, proof, actor)),
    canCancel: pending && (proof.record.createdBy === actor.id || actor.admin),
    manualRequired: proof.requirements.manual,
    manualProcedures: proof.procedures
      .filter((procedure) => procedure.mechanism === 'MANUAL')
      .map((procedure) => procedure.manualProcedure),
    executionProblem,
    approvableOfficeIds:
      pending && !proof.stale
        ? [
            ...new Set(
              proof.holders
                .filter((holder) => holder.userId === actor.id && required.has(holder.officeId))
                .map((holder) => holder.officeId),
            ),
          ]
        : [],
    approvalGroups: proof.requirements.approvalGroups,
    approvals: proof.approvals,
    votes: proof.votes,
  };
}
async function authorizedCompanyProof(
  transaction: Transaction,
  id: string,
  actor: CompanyActor,
): Promise<CompanyProofs> {
  const proof = await companyDecisionProofs(transaction, id);
  await assertDecisionReader(transaction, proof, actor);
  return proof;
}
export { companyDecisionSummary, companyDecisionDetail, authorizedCompanyProof };
