import type { Policy } from './contracts';
import { canonicalJson } from './configuration-hash';
import { DomainError, HTTP } from '../errors';

const BANK_ACTIONS: readonly Policy['action'][] = [
  'CHANGE_BANK_CHARTER',
  'CREATE_CURRENCY',
  'CHANGE_MONETARY_POLICY',
  'ISSUE_CURRENCY',
  'BURN_CURRENCY',
  'TRANSFER_CENTRAL_BANK',
];
const TAX_ACTIONS: readonly Policy['action'][] = [
  'CHANGE_TAX_OFFICE_CHARTER',
  'ENACT_LAW',
  'AMEND_TAX_LAW',
  'REPEAL_LAW',
];
function mergeInstitutionPolicies(
  current: readonly Policy[],
  initial: readonly Policy[],
  kind: 'ESTABLISH_BANK' | 'ESTABLISH_TAX_OFFICE',
): Policy[] {
  const allowed = kind === 'ESTABLISH_BANK' ? BANK_ACTIONS : TAX_ACTIONS;
  if (
    initial.some((policy) => !allowed.includes(policy.action)) ||
    new Set(initial.map((policy) => policy.action)).size !== initial.length
  ) {
    throw new DomainError(
      HTTP.badRequest,
      'INVALID_INSTITUTION_POLICY',
      'Выберите только процедуры учреждаемого института без повторений',
    );
  }
  const added: Policy[] = [];
  for (const policy of initial) {
    const existing = current.find((item) => item.action === policy.action);
    if (existing !== undefined && canonicalJson(existing) !== canonicalJson(policy)) {
      throw new DomainError(
        HTTP.conflict,
        'INSTITUTION_POLICY_EXISTS',
        'Существующие процедуры изменяются только через реформу',
      );
    }
    if (existing === undefined) {
      added.push(policy);
    }
  }
  return [...current, ...added];
}
export { BANK_ACTIONS, TAX_ACTIONS, mergeInstitutionPolicies };
