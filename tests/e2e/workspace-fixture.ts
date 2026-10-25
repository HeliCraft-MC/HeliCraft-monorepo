import type { Page } from '@playwright/test';
import type { Principal, VotingDetail, CompanyWorkspace } from '../../packages/alhena/src';
import { state, taxation } from './workspace-state-fixture';
import { officeCompanyConfiguration } from '../../apps/antares/tests/companies-fixture';

const PLAYER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const COMPANY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
const STATE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const VOTING_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const principal: Principal = {
  id: PLAYER_ID,
  username: 'WorkspaceTester',
  status: 'ACTIVE',
  currentSkinId: null,
  roles: ['ADMIN'],
  permissions: ['content.read', 'users.read', 'states.manage', 'voting.manage', 'site.manage'],
  createdAt: '2026-10-23T00:00:00Z',
};
const company: CompanyWorkspace = {
  id: COMPANY_ID,
  registrationStateId: STATE_ID,
  currentRevisionId: VOTING_ID,
  status: 'ACTIVE',
  issuedShares: '37',
  canReadFinance: true,
  availableActions: [
    'REGISTER_BRANCH',
    'ISSUE_SHARES',
    'AMEND_CHARTER',
    'CREATE_OFFICE',
    'TRANSFER_FUNDS',
  ],
  content: officeCompanyConfiguration(PLAYER_ID, STATE_ID),
  holders: [],
  shareholders: [{ owner: { type: 'PLAYER', id: PLAYER_ID }, shares: '37' }],
};
const voting: VotingDetail = {
  id: VOTING_ID,
  status: 'OPEN',
  eligible: true,
  hasVoted: false,
  subject: null,
  result: null,
  governanceRevisionId: null,
  companyRevisionId: null,
  input: {
    title: { en: 'Community transport', ru: 'Общественный транспорт' },
    description: { en: 'Choose a route for the community.' },
    opensAt: '2026-10-23T00:00:00Z',
    closesAt: '2026-10-24T00:00:00Z',
    electorate: { type: 'GLOBAL_USERS' },
    options: [
      { id: 'yes', label: { en: 'Build the port' } },
      { id: 'no', label: { en: 'Keep the coast' } },
    ],
    questions: [
      {
        id: 'build',
        title: { en: 'What should we build?' },
        optionIds: ['yes', 'no'],
        maxSelections: 1,
      },
    ],
    maxSelections: 1,
    resultVisibility: 'AFTER_CLOSE',
    rules: {
      durationHours: 24,
      quorumPercent: 0,
      thresholdPercent: 50,
      thresholdKind: 'PERCENT',
      allowAbstain: true,
    },
  },
};
async function interceptWorkspace(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ json: principal });
  });
  await page.route('**/api/v1/account/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let response: unknown = { items: [], page: 1, hasMore: false };
    if (path === `/api/v1/account/states/${STATE_ID}`) {
      response = state;
    } else if (path === `/api/v1/account/states/${STATE_ID}/taxation`) {
      response = taxation;
    } else if (path === '/api/v1/account/states') {
      response = { items: [{ id: STATE_ID, name: state.configuration.name, slug: state.slug }] };
    } else if (path === '/api/v1/account/me') {
      response = principal;
    } else if (path === `/api/v1/account/companies/${COMPANY_ID}`) {
      response = company;
    } else if (path.endsWith('/votings')) {
      response = { ids: [VOTING_ID] };
    } else if (path.endsWith(`/votings/${VOTING_ID}`)) {
      response = voting;
    }
    await route.fulfill({ json: response });
  });
  await page.route('**/api/v1/admin/votings**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ json: path.endsWith('/votings') ? { ids: [VOTING_ID] } : voting });
  });
}
export { interceptWorkspace, COMPANY_ID };
