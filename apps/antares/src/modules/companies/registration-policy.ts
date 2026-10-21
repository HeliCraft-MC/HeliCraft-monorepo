import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { currencyRecord } from '../monetary/store';
import { readRevision } from '../states/revisions';
import { stateRecord } from '../states/persistence';
import { latestRegistrationPolicy } from './store';
import type { CompanyStateDirective } from './registration-contracts';
import type { CompanyRegistrationPolicy } from './contracts';

async function assertReviewPolicies(
  transaction: Transaction,
  stateId: string,
  policy: CompanyRegistrationPolicy,
): Promise<void> {
  const state = await stateRecord(transaction, stateId);
  const revision =
    state.currentRevisionId === null
      ? null
      : await readRevision(transaction, state.currentRevisionId);
  const actions = new Set(
    revision?.configuration.governance.policies.map((candidate) => candidate.action),
  );
  if (policy.companyMode === 'APPROVAL' && !actions.has('REGISTER_COMPANY')) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_REVIEW_POLICY_MISSING',
      'Сначала настройте через Governance процедуру одобрения регистрации компаний',
    );
  }
  if (policy.branchMode === 'APPROVAL' && !actions.has('REGISTER_COMPANY_BRANCH')) {
    throw new DomainError(
      HTTP.conflict,
      'BRANCH_REVIEW_POLICY_MISSING',
      'Сначала настройте через Governance процедуру одобрения филиалов',
    );
  }
}
async function assertPolicyChange(
  transaction: Transaction,
  stateId: string,
  payload: Extract<CompanyStateDirective, { kind: 'SET_COMPANY_REGISTRATION_POLICY' }>,
): Promise<void> {
  const previous = await latestRegistrationPolicy(transaction, stateId);
  if ((previous?.id ?? null) !== payload.baseRevisionId) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_REGISTRATION_POLICY_STALE',
      'Правила регистрации изменились. Подготовьте новое решение',
    );
  }
  if (payload.policy.registrationFee !== null) {
    const currency = await currencyRecord(transaction, payload.policy.registrationFee.currencyId);
    if (currency.status !== 'ACTIVE') {
      throw new DomainError(
        HTTP.conflict,
        'REGISTRATION_FEE_CURRENCY_BLOCKED',
        'Валюта регистрационного сбора недоступна',
      );
    }
  }
  await assertReviewPolicies(transaction, stateId, payload.policy);
}
export { assertPolicyChange };
