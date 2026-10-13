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
