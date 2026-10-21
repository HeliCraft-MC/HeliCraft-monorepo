import type {
  CompanyCharter,
  CompanyOffice,
  CompanyAuthorityProcedure,
  CompanyAuthorityPolicy,
  GovernanceVotingRules,
} from '@helicraft/alhena';

const COMPANY_ACTIONS: readonly CompanyAuthorityPolicy['action'][] = [
  'AMEND_CHARTER',
  'UPDATE_PROFILE',
  'CREATE_OFFICE',
  'UPDATE_OFFICE',
  'APPOINT_OFFICE_HOLDER',
  'REMOVE_OFFICE_HOLDER',
  'TRANSFER_FUNDS',
  'ISSUE_SHARES',
  'AUTHORIZE_SHARE_TRANSFER',
  'TRANSFER_OWNED_SHARES',
  'FOUND_COMPANY',
  'REGISTER_BRANCH',
  'CLOSE_BRANCH',
  'VOTE_AS_SHAREHOLDER',
  'ACCEPT_SHARE_ACQUISITION',
  'REVOKE_SHARE_ACQUISITION',
];
const COMPANY_MECHANISMS: readonly CompanyAuthorityProcedure['mechanism'][] = [
  'SINGLE_OFFICE',
  'ANY_OF_OFFICES',
  'MULTIPLE_OFFICES',
  'SHAREHOLDER_VOTE',
  'OFFICE_VOTE',
  'COMBINED',
  'MANUAL',
];
function shareholderProcedure(): CompanyAuthorityProcedure {
  return { mechanism: 'SHAREHOLDER_VOTE', officeIds: [], vote: null, manualProcedure: {} };
}
function newCompanyOffice(): CompanyOffice {
  return {
    id: crypto.randomUUID(),
    name: {},
    description: {},
    maxHolders: 1,
    required: false,
    termDays: null,
    appointment: shareholderProcedure(),
    removal: shareholderProcedure(),
    initialHolderIds: [],
  };
}
function charterPreset(
  kind: 'SHAREHOLDERS' | 'OFFICER',
  defaults: GovernanceVotingRules,
  actorId: string,
): CompanyCharter {
  const office: CompanyOffice = {
    ...newCompanyOffice(),
    name: { en: 'Authorized representative', ru: 'Уполномоченный представитель' },
    initialHolderIds: [actorId],
  };
  const procedure: CompanyAuthorityProcedure =
    kind === 'SHAREHOLDERS'
      ? shareholderProcedure()
      : { mechanism: 'SINGLE_OFFICE', officeIds: [office.id], vote: null, manualProcedure: {} };
  return {
    offices: kind === 'SHAREHOLDERS' ? [] : [office],
    policies: COMPANY_ACTIONS.map((action) => ({
      action,
      procedure: structuredClone(procedure),
      financialBands: [],
    })),
    votingDefaults: defaults,
    shareTransfers: 'OWNER_CONSENT',
  };
}
export {
  COMPANY_ACTIONS,
  COMPANY_MECHANISMS,
  shareholderProcedure,
  newCompanyOffice,
  charterPreset,
};
