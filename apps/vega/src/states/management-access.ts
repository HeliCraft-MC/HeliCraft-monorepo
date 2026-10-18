import type { StateDetail } from '@helicraft/alhena';
import { availableKinds } from '../monetary/model';
import type { DirectiveKind } from '../monetary/model';
import { economicAuthority } from '../taxation/model';
import type { ManagementSection } from './management-sections';

const taxationKinds = [
  'ESTABLISH_TAX_OFFICE',
  'CHANGE_TAX_CHARTER',
  'ENACT_TAX_LAW',
  'AMEND_TAX_LAW',
  'REPEAL_TAX_LAW',
] as const;
const monetarySections: readonly { section: ManagementSection; kinds: readonly DirectiveKind[] }[] =
  [
    { section: 'bank', kinds: ['ESTABLISH_BANK', 'CHANGE_CHARTER'] },
    { section: 'currency', kinds: ['CREATE_CURRENCY'] },
    { section: 'monetary-policy', kinds: ['CHANGE_POLICY'] },
    { section: 'issuance', kinds: ['ISSUE', 'BURN'] },
    { section: 'bank-finances', kinds: ['BANK_TRANSFER'] },
    { section: 'treasury', kinds: ['TREASURY_TRANSFER'] },
  ];
function managementSections(state: StateDetail, actorId: string): ManagementSection[] {
  if (!state.citizens.some((person) => person.id === actorId)) {
    return [];
  }
  const sections: ManagementSection[] = ['overview', 'citizens', 'government'];
  const { governance } = state.configuration;
  if (state.status === 'ACTIVE') {
    // Citizens can propose appointments; the API collects every required approval and vote.
    if (
      governance.offices.length > 0 &&
      governance.policies.some(
        (policy) =>
          policy.action === 'APPOINT_OFFICE_HOLDER' || policy.action === 'REMOVE_OFFICE_HOLDER',
      )
    ) {
      sections.push('appointments');
    }
    sections.push('proposals');
    const kinds = availableKinds(state, actorId);
    sections.push(
      ...monetarySections
        .filter((item) => item.kinds.some((kind) => kinds.includes(kind)))
        .map((item) => item.section),
    );
    if (taxationKinds.some((kind) => economicAuthority(state, actorId, kind))) {
      sections.push('taxation');
    }
    sections.push('diplomacy');
  }
  return [...sections, 'history', 'citizenship'];
}
export { managementSections };
