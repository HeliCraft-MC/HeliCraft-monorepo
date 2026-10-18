import type { GovernancePolicy } from '@helicraft/alhena';

function decisionPolicy(
  policies: readonly GovernancePolicy[],
  action: GovernancePolicy['action'],
): GovernancePolicy | undefined {
  if (action === 'ESTABLISH_CENTRAL_BANK' || action === 'ESTABLISH_TAX_OFFICE') {
    const shared = policies.find((policy) => policy.action === 'CREATE_INSTITUTION');
    if (shared) {
      return shared;
    }
  }
  return policies.find((policy) => policy.action === action);
}
export { decisionPolicy };
