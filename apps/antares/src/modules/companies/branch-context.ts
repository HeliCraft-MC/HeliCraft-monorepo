import { eq } from 'drizzle-orm';
import { companyBranches, companyBranchApplications } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { stateRecord } from '../states/persistence';
import { companyRecord, latestRegistrationPolicy } from './store';
import type { BranchRegistration, BranchClose } from './branch-contracts';
import { assertBranchPolicy, assertBranchResubmission } from './branch-domain';

type BranchRecord = typeof companyBranches.$inferSelect;
type BranchApplicationRecord = typeof companyBranchApplications.$inferSelect;
async function branchRecord(transaction: Transaction, id: string): Promise<BranchRecord> {
  const [branch] = await transaction
    .select()
    .from(companyBranches)
    .where(eq(companyBranches.id, id))
    .for('update');
  if (!branch) {
    throw new DomainError(HTTP.notFound, 'COMPANY_BRANCH_NOT_FOUND', 'Филиал не найден');
  }
  return branch;
}
async function branchApplication(
  transaction: Transaction,
  id: string,
): Promise<BranchApplicationRecord> {
  const [application] = await transaction
    .select()
    .from(companyBranchApplications)
    .where(eq(companyBranchApplications.id, id))
    .for('update');
  if (!application) {
    throw new DomainError(
      HTTP.notFound,
      'BRANCH_APPLICATION_NOT_FOUND',
      'Заявка филиала не найдена',
    );
  }
  return application;
}
async function branchRegistrationContext(
  transaction: Transaction,
  companyId: string,
  payload: BranchRegistration,
): Promise<{
  previous: BranchRecord | undefined;
  policy: NonNullable<Awaited<ReturnType<typeof latestRegistrationPolicy>>>;
}> {
  const company = await companyRecord(transaction, companyId);
  const host = await stateRecord(transaction, payload.stateId);
  const policy = await latestRegistrationPolicy(transaction, host.id);
  if (policy === null) {
    throw new DomainError(
      HTTP.conflict,
      'REGISTRATION_POLICY_MISSING',
      'Государство присутствия ещё не утвердило правила регистрации',
    );
  }
  assertBranchPolicy(
    {
      companyStatus: company.status,
      registrationStateId: company.registrationStateId,
      hostActive: host.status === 'ACTIVE',
      latestPolicyId: policy.id,
      policy: policy.policy,
    },
    payload,
  );
  const [previous] = await transaction
    .select()
    .from(companyBranches)
    .where(eq(companyBranches.id, payload.branchId))
    .for('update');
  if (previous) {
    if (previous.companyId !== companyId || previous.stateId !== payload.stateId) {
      throw new DomainError(
        HTTP.conflict,
        'BRANCH_IDENTITY_CONFLICT',
        'Идентификатор филиала уже связан с другой компанией или государством',
      );
    }
    assertBranchResubmission(previous.status);
  }
  return { previous, policy };
}
async function assertBranchClose(
  transaction: Transaction,
  companyId: string,
  payload: BranchClose,
): Promise<BranchRecord> {
  const branch = await branchRecord(transaction, payload.branchId);
  if (branch.companyId !== companyId) {
    throw new DomainError(HTTP.notFound, 'COMPANY_BRANCH_NOT_FOUND', 'Филиал не найден');
  }
  if (branch.status === 'CLOSED') {
    throw new DomainError(HTTP.conflict, 'BRANCH_CLOSED', 'Филиал уже закрыт');
  }
  return branch;
}
export {
  branchRecord,
  branchApplication,
  branchRegistrationContext,
  assertBranchClose,
  type BranchRecord,
  type BranchApplicationRecord,
};
