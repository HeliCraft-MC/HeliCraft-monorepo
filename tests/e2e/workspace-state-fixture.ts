import type { StateDetail, StateTaxation } from '../../packages/alhena/src';
import { emptyConfiguration } from '../../apps/antares/src/modules/states/domain';
import { applyPreset } from '../../apps/antares/src/modules/states/presets';

const PLAYER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const STATE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const REVISION_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const governance = applyPreset('AUTOCRACY', PLAYER_ID);
const [office] = governance.offices;
if (office === undefined) {
  throw new Error('Missing workspace fixture office');
}
governance.policies.push({
  action: 'ENACT_LAW',
  mechanism: 'SINGLE_OFFICE',
  officeIds: [office.id],
  vote: null,
  manualProcedure: {},
});
const state: StateDetail = {
  id: STATE_ID,
  slug: 'published-jurisdiction',
  status: 'ACTIVE',
  statusReason: null,
  configuration: { ...emptyConfiguration(), name: { en: 'Published jurisdiction' }, governance },
  founders: [{ id: PLAYER_ID, name: 'WorkspaceTester', type: 'PRIMARY' }],
  citizens: [{ id: PLAYER_ID, name: 'WorkspaceTester' }],
  holders: [
    {
      officeId: office.id,
      userId: PLAYER_ID,
      name: 'WorkspaceTester',
      since: '2026-10-23T00:00:00Z',
    },
  ],
  governanceRevisionId: REVISION_ID,
  governanceRevision: 1,
  constitutionRevisionId: null,
  createdAt: '2026-10-23T00:00:00Z',
  constitutionHtml: [],
};
const taxation: StateTaxation = {
  office: {
    id: REVISION_ID,
    stateId: STATE_ID,
    status: 'ACTIVE',
    charterDirectiveId: REVISION_ID,
    establishmentDirectiveId: REVISION_ID,
    name: { en: 'Tax office' },
    description: {},
    createdAt: '2026-10-23T00:00:00Z',
    reviews: [],
  },
  laws: [],
  directives: [],
  accounts: [],
  currencies: [],
  assessments: [],
  receipts: [],
  totals: [],
  page: 1,
  hasMore: false,
};
export { state, taxation, STATE_ID };
