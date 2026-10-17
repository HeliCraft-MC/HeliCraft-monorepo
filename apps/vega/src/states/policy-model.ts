import type { GovernancePolicy } from '@helicraft/alhena';

const mechanisms = [
  'SINGLE_OFFICE',
  'ANY_OF_OFFICES',
  'MULTIPLE_OFFICES',
  'CITIZEN_VOTE',
  'COUNCIL_VOTE',
  'COMBINED',
  'MANUAL',
] as const;
const actions = [
  'AMEND_GOVERNANCE',
  'ENACT_LAW',
  'REPEAL_LAW',
  'ACCEPT_CITIZEN',
  'REMOVE_CITIZEN',
  'APPOINT_OFFICE_HOLDER',
  'REMOVE_OFFICE_HOLDER',
  'ESTABLISH_CENTRAL_BANK',
  'CHANGE_BANK_CHARTER',
  'CREATE_CURRENCY',
  'CHANGE_MONETARY_POLICY',
  'ISSUE_CURRENCY',
  'BURN_CURRENCY',
  'TRANSFER_CENTRAL_BANK',
  'SPEND_TREASURY',
  'ESTABLISH_TAX_OFFICE',
  'CHANGE_TAX_OFFICE_CHARTER',
  'AMEND_TAX_LAW',
  'AMEND_TREATY',
  'DENOUNCE_TREATY',
  'SIGN_TREATY',
] as const;
function newPolicy(action: GovernancePolicy['action']): GovernancePolicy {
  return { action, mechanism: 'CITIZEN_VOTE', officeIds: [], vote: null, manualProcedure: {} };
}
function selectedOffices(policy: GovernancePolicy, officeId: string, selected: boolean): string[] {
  if (!selected) {
    return policy.officeIds.filter((item) => item !== officeId);
  }
  if (policy.mechanism === 'SINGLE_OFFICE') {
    return [officeId];
  }
  return [...policy.officeIds, officeId];
}
export { mechanisms, actions, newPolicy, selectedOffices };
