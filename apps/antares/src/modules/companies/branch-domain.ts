import { DomainError, HTTP } from '../errors';
import { resolveText } from '../localized-content/contracts';
import type { CompanyRegistrationPolicy, CompanyStatus } from './contracts';
import type { BranchRegistration, BranchStatus } from './branch-contracts';

interface BranchPolicyContext {
  readonly companyStatus: CompanyStatus;
  readonly registrationStateId: string | null;
  readonly hostActive: boolean;
  readonly latestPolicyId: string;
  readonly policy: CompanyRegistrationPolicy;
}
function assertBranchPolicy(context: BranchPolicyContext, request: BranchRegistration): void {
  if (context.companyStatus !== 'ACTIVE' || !context.hostActive) {
    throw new DomainError(
      HTTP.conflict,
      'BRANCH_PARTICIPANT_INACTIVE',
      'Компания и государство присутствия должны быть активны',
    );
  }
  if (context.latestPolicyId !== request.policyRevisionId) {
    throw new DomainError(
      HTTP.conflict,
      'BRANCH_POLICY_STALE',
      'Правила регистрации филиала изменились. Подготовьте новое корпоративное решение',
    );
  }
  if (
    context.policy.branchMode === 'DENY' ||
    (context.policy.foreignBranches === 'DENY' && context.registrationStateId !== request.stateId)
  ) {
    throw new DomainError(
      HTTP.conflict,
      'BRANCH_REGISTRATION_RESTRICTED',
      'Действующие правила государства не разрешают регистрацию этого филиала',
    );
  }
  if (!resolveText(request.name, 'en').value.trim()) {
    throw new DomainError(
      HTTP.conflict,
      'BRANCH_NAME_REQUIRED',
      'Укажите название филиала хотя бы на одном языке сайта',
    );
  }
}
function assertBranchResubmission(status: BranchStatus): void {
  if (status === 'ACTIVE' || status === 'CLOSED') {
    throw new DomainError(
      HTTP.conflict,
      'BRANCH_ALREADY_REGISTERED',
      'Филиал уже действует или окончательно закрыт',
    );
  }
}
export { assertBranchPolicy, assertBranchResubmission, type BranchPolicyContext };
