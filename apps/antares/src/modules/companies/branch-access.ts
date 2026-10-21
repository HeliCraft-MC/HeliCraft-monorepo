import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assignmentState } from '../states/office-assignment-context';
import type { CompanyActor } from './decision-contracts';
import { assertCompanyReader } from './workspace-read';
import type { BranchRecord } from './branch-context';

async function assertBranchReader(
  transaction: Transaction,
  branch: BranchRecord,
  actor: CompanyActor,
): Promise<void> {
  try {
    await assertCompanyReader(transaction, branch.companyId, actor);
    return;
  } catch (error) {
    if (
      !(error instanceof DomainError) ||
      (error.status !== HTTP.notFound && error.status !== HTTP.forbidden)
    ) {
      throw error;
    }
  }
  try {
    await assignmentState(transaction, branch.stateId, actor);
  } catch (error) {
    if (
      error instanceof DomainError &&
      (error.status === HTTP.notFound || error.status === HTTP.forbidden)
    ) {
      throw new DomainError(HTTP.notFound, 'COMPANY_BRANCH_NOT_FOUND', 'Филиал не найден');
    }
    throw error;
  }
}
export { assertBranchReader };
