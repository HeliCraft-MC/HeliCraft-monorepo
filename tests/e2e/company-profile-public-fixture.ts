import type {
  PublishedCompanyProfile,
  PublishedCompanyIdentity,
  PublishedCompanyBranchList,
} from '../../packages/alhena/src';
import { officeCompanyConfiguration } from '../../apps/antares/tests/companies-fixture';

const OWNER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const config = officeCompanyConfiguration(OWNER_ID, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const player: PublishedCompanyProfile['holders'][number]['player'] = {
  owner: { type: 'PLAYER', id: OWNER_ID },
  name: { en: 'PublicOfficer' },
  href: `/players/${OWNER_ID}`,
};
function profileFixture(identity: PublishedCompanyIdentity): PublishedCompanyProfile {
  const [office] = config.charter.offices;
  if (office === undefined) {
    throw new Error('Published office missing');
  }
  return {
    identity,
    revisionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    revision: 1,
    categories: ['Voluntary descriptive activity'],
    charter: config.charter,
    documentHtml:
      '<h2 id="hc-heading-charter">Published formal charter</h2><p>Machine-readable policies govern authority.</p>',
    issuedShares: '900719925474099312345',
    holders: [
      {
        officeId: office.id,
        player,
        since: identity.foundedAt,
      },
    ],
    owners: {
      page: 1,
      hasMore: false,
      items: [
        {
          identity: player,
          shares: '900719925474099312345',
        },
      ],
    },
    holdings: { page: 1, hasMore: false, items: [] },
    history: {
      page: 1,
      hasMore: false,
      items: [
        {
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          kind: 'UPDATE_PROFILE',
          appliedAt: identity.foundedAt,
        },
      ],
    },
  };
}
function branchFixture(companyId: string): PublishedCompanyBranchList {
  return {
    page: 1,
    hasMore: false,
    items: [
      {
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        companyId,
        stateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        stateName: {
          en: 'Foreign host jurisdiction with a deliberately long published name',
          ru: 'Иностранное государство регистрации филиала с очень длинным названием',
        },
        name: {
          en: 'Registered foreign branch with a long legal name',
          ru: 'Зарегистрированный иностранный филиал с длинным юридическим названием',
        },
        description: {},
        status: 'ACTIVE',
        createdAt: '2026-10-18T23:00:00.000Z',
      },
    ],
  };
}
export { profileFixture, branchFixture };
