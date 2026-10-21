import { eq, sql } from 'drizzle-orm';
import { companyBranches, companyBranchApplications, companyBranchEvents } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { CompanyDecisionPayload } from './decision-contracts';
import type { CompanyProofs } from './decision-proofs';
import type { BranchRegistration, BranchClose } from './branch-contracts';
import { branchRegistrationContext, assertBranchClose, branchApplication } from './branch-context';
import type { BranchRecord } from './branch-context';

async function supersedeBranchApplication(
  transaction: Transaction,
  branch: BranchRecord,
  decisionId: string,
): Promise<void> {
  const application = await branchApplication(transaction, branch.currentApplicationId);
  if (application.status === 'PENDING') {
    await transaction
      .update(companyBranchApplications)
      .set({ status: 'SUPERSEDED', completionDecisionId: decisionId })
      .where(eq(companyBranchApplications.id, application.id));
  }
}
async function registerCompanyBranch(
  transaction: Transaction,
  input: Readonly<{ proof: CompanyProofs; payload: BranchRegistration; actorId: string }>,
): Promise<void> {
  const { proof, payload, actorId } = input;
  const { previous, policy } = await branchRegistrationContext(
    transaction,
    proof.company.id,
    payload,
  );
  const automatic = policy.policy.branchMode === 'FREE';
  if (previous) {
    await supersedeBranchApplication(transaction, previous, proof.record.id);
  }
  const status = automatic ? 'ACTIVE' : 'PENDING_REGISTRATION';
  await (previous
    ? transaction
        .update(companyBranches)
        .set({ status, currentApplicationId: proof.record.id })
        .where(eq(companyBranches.id, previous.id))
    : transaction.insert(companyBranches).values({
        id: payload.branchId,
        companyId: proof.company.id,
        stateId: payload.stateId,
        status,
        currentApplicationId: proof.record.id,
        createdAt: sql`clock_timestamp()`,
      }));
  await transaction.insert(companyBranchApplications).values({
    id: proof.record.id,
    branchId: payload.branchId,
    policyRevisionId: policy.id,
    status: automatic ? 'APPROVED' : 'PENDING',
    createdAt: sql`clock_timestamp()`,
  });
  await transaction.insert(companyBranchEvents).values({
    branchId: payload.branchId,
    applicationId: proof.record.id,
    fromStatus: previous?.status ?? null,
    toStatus: status,
    actorId,
    companyDecisionId: proof.record.id,
    createdAt: sql`clock_timestamp()`,
  });
}
async function closeCompanyBranch(
  transaction: Transaction,
  input: Readonly<{ proof: CompanyProofs; payload: BranchClose; actorId: string }>,
): Promise<void> {
  const { proof, payload, actorId } = input;
  const branch = await assertBranchClose(transaction, proof.company.id, payload);
  const application = await branchApplication(transaction, branch.currentApplicationId);
  if (application.status === 'PENDING') {
    await transaction
      .update(companyBranchApplications)
      .set({ status: 'CANCELLED', completionDecisionId: proof.record.id })
      .where(eq(companyBranchApplications.id, application.id));
  }
  await transaction
    .update(companyBranches)
    .set({ status: 'CLOSED' })
    .where(eq(companyBranches.id, branch.id));
  await transaction.insert(companyBranchEvents).values({
    branchId: branch.id,
    applicationId: application.id,
    fromStatus: branch.status,
    toStatus: 'CLOSED',
    actorId,
    companyDecisionId: proof.record.id,
    createdAt: sql`clock_timestamp()`,
  });
}
type CorporateBranchAction = BranchRegistration | BranchClose;
function isCorporateBranchAction(
  payload: CompanyDecisionPayload,
): payload is CorporateBranchAction {
  return payload.kind === 'REGISTER_BRANCH' || payload.kind === 'CLOSE_BRANCH';
}
async function assertCorporateBranchAction(
  transaction: Transaction,
  companyId: string,
  payload: CorporateBranchAction,
): Promise<void> {
  await (payload.kind === 'REGISTER_BRANCH'
    ? branchRegistrationContext(transaction, companyId, payload)
    : assertBranchClose(transaction, companyId, payload));
}
async function executeCorporateBranchAction(
  transaction: Transaction,
  input: Readonly<{ proof: CompanyProofs; payload: CorporateBranchAction; actorId: string }>,
): Promise<void> {
  const { proof, payload, actorId } = input;
  await (payload.kind === 'REGISTER_BRANCH'
    ? registerCompanyBranch(transaction, { proof, payload, actorId })
    : closeCompanyBranch(transaction, { proof, payload, actorId }));
}
export {
  isCorporateBranchAction,
  assertCorporateBranchAction,
  executeCorporateBranchAction,
  type CorporateBranchAction,
};
