import { eq, sql } from 'drizzle-orm';
import { companyBranches, companyBranchApplications, companyBranchEvents } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { DirectiveRecord } from '../monetary/store';
import { DomainError, HTTP } from '../errors';
import type { BranchReview } from './branch-contracts';
import { branchRecord, branchApplication, branchRegistrationContext } from './branch-context';
import type { BranchRecord, BranchApplicationRecord } from './branch-context';
import { companyDecisionProofs } from './decision-proofs';

async function assertBranchReview(
  transaction: Transaction,
  stateId: string,
  payload: BranchReview,
): Promise<{ branch: BranchRecord; application: BranchApplicationRecord }> {
  const application = await branchApplication(transaction, payload.applicationId);
  const branch = await branchRecord(transaction, application.branchId);
  if (
    branch.id !== payload.branchId ||
    branch.stateId !== stateId ||
    branch.currentApplicationId !== application.id ||
    branch.status !== 'PENDING_REGISTRATION' ||
    application.status !== 'PENDING'
  ) {
    throw new DomainError(
      HTTP.conflict,
      'BRANCH_APPLICATION_STALE',
      'Заявка филиала завершена, заменена или относится к другому государству',
    );
  }
  if (payload.decision === 'APPROVE') {
    const proof = await companyDecisionProofs(transaction, application.id);
    if (
      proof.record.status !== 'APPLIED' ||
      !proof.ready ||
      proof.stale ||
      proof.payload.kind !== 'REGISTER_BRANCH'
    ) {
      throw new DomainError(
        HTTP.conflict,
        'BRANCH_CORPORATE_AUTHORITY_STALE',
        'Полномочия компании изменились. Требуется новое корпоративное решение о филиале',
      );
    }
    const context = await branchRegistrationContext(transaction, branch.companyId, proof.payload);
    if (
      context.policy.id !== application.policyRevisionId ||
      context.policy.policy.branchMode !== 'APPROVAL'
    ) {
      throw new DomainError(
        HTTP.conflict,
        'BRANCH_POLICY_STALE',
        'Для новых правил требуется новая заявка филиала',
      );
    }
  }
  return { branch, application };
}
async function reviewCompanyBranch(
  transaction: Transaction,
  input: Readonly<{ record: DirectiveRecord; actorId: string; payload: BranchReview }>,
): Promise<void> {
  const { record, actorId, payload } = input;
  const { branch, application } = await assertBranchReview(transaction, record.stateId, payload);
  const approved = payload.decision === 'APPROVE';
  await transaction
    .update(companyBranchApplications)
    .set({
      status: approved ? 'APPROVED' : 'REJECTED',
      reviewDirectiveId: record.id,
      reviewedBy: actorId,
      reviewReason: payload.reason,
      reviewedAt: sql`clock_timestamp()`,
    })
    .where(eq(companyBranchApplications.id, application.id));
  await transaction
    .update(companyBranches)
    .set({ status: approved ? 'ACTIVE' : 'REJECTED' })
    .where(eq(companyBranches.id, branch.id));
  await transaction.insert(companyBranchEvents).values({
    branchId: branch.id,
    applicationId: application.id,
    fromStatus: branch.status,
    toStatus: approved ? 'ACTIVE' : 'REJECTED',
    actorId,
    stateDirectiveId: record.id,
    createdAt: sql`clock_timestamp()`,
  });
}
export { assertBranchReview, reviewCompanyBranch };
