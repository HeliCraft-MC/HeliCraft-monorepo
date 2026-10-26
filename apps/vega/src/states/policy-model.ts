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
const optionalActions = [
  'CREATE_INSTITUTION',
  'CHANGE_TERRITORY',
  'CHANGE_BANK_CHARTER',
  'CREATE_CURRENCY',
  'CHANGE_MONETARY_POLICY',
  'ISSUE_CURRENCY',
  'BURN_CURRENCY',
  'TRANSFER_CENTRAL_BANK',
  'SPEND_TREASURY',
  'CHANGE_TAX_OFFICE_CHARTER',
  'AMEND_TAX_LAW',
  'AMEND_TREATY',
  'DENOUNCE_TREATY',
  'SIGN_TREATY',
  'SET_COMPANY_REGISTRATION_POLICY',
  'REGISTER_COMPANY',
  'REGISTER_COMPANY_BRANCH',
  'PARTICIPATE_IN_COMPANY',
  'ACQUIRE_COMPANY_SHARES',
  'TRANSFER_COMPANY_SHARES',
  'MANAGE_FX_OFFERS',
  'CANCEL_FX_OFFERS',
  'APPROVE_INTERBANK_EXCHANGE',
] as const;
const actions = [
  'AMEND_GOVERNANCE',
  'ENACT_LAW',
  'REPEAL_LAW',
  'ACCEPT_CITIZEN',
  'REMOVE_CITIZEN',
  'APPOINT_OFFICE_HOLDER',
  'REMOVE_OFFICE_HOLDER',
  ...optionalActions,
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
function replacePolicy(
  policies: readonly GovernancePolicy[],
  policy: GovernancePolicy,
): GovernancePolicy[] {
  return [
    ...policies.filter(
      (item) =>
        item.action !== policy.action &&
        !(
          policy.action === 'CREATE_INSTITUTION' &&
          ['ESTABLISH_CENTRAL_BANK', 'ESTABLISH_TAX_OFFICE'].includes(item.action)
        ),
    ),
    policy,
  ];
}
export { mechanisms, actions, optionalActions, newPolicy, selectedOffices, replacePolicy };
