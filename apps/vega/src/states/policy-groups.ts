import type { GovernancePolicy } from '@helicraft/alhena';

type PolicyGroup = 'state' | 'bank' | 'tax';
const groups: Readonly<Partial<Record<GovernancePolicy['action'], PolicyGroup>>> = {
  CHANGE_BANK_CHARTER: 'bank',
  CREATE_CURRENCY: 'bank',
  CHANGE_MONETARY_POLICY: 'bank',
  ISSUE_CURRENCY: 'bank',
  BURN_CURRENCY: 'bank',
  TRANSFER_CENTRAL_BANK: 'bank',
  MANAGE_FX_OFFERS: 'bank',
  CANCEL_FX_OFFERS: 'bank',
  APPROVE_INTERBANK_EXCHANGE: 'bank',
  CHANGE_TAX_OFFICE_CHARTER: 'tax',
  ENACT_LAW: 'tax',
  AMEND_TAX_LAW: 'tax',
  REPEAL_LAW: 'tax',
};
function policyGroup(action: GovernancePolicy['action']): PolicyGroup {
  return groups[action] ?? 'state';
}
function institutionGroup(kind: string): 'bank' | 'tax' | null {
  if (kind === 'ESTABLISH_BANK') {
    return 'bank';
  }
  return kind === 'ESTABLISH_TAX_OFFICE' ? 'tax' : null;
}
export { policyGroup, institutionGroup, type PolicyGroup };
