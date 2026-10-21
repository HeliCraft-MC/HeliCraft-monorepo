import { describe, expect, it } from 'vitest';
import {
  CompanyConfigurationSchema,
  CompanyRegistrationPolicySchema,
} from '../src/modules/companies/contracts';
import type { CompanyConfiguration, CompanyProcedure } from '../src/modules/companies/contracts';
import {
  assertCompanyFormation,
  companyProcedure,
  companyRequirements,
} from '../src/modules/companies/domain';
import { emptyConfiguration } from '../src/modules/states/domain';

const shareholderVote: CompanyProcedure = {
  mechanism: 'SHAREHOLDER_VOTE',
  officeIds: [],
  vote: null,
  manualProcedure: {},
};
function configuration(): CompanyConfiguration {
  return {
    registrationStateId: crypto.randomUUID(),
    name: { en: 'Universal corporation' },
    description: {},
    categories: [],
    totalShares: '900719925474099312',
    allocations: [
      { owner: { type: 'PLAYER', id: crypto.randomUUID() }, shares: '900719925474099312' },
    ],
    charter: {
      offices: [],
      policies: [{ action: 'AMEND_CHARTER', procedure: shareholderVote, financialBands: [] }],
      votingDefaults: emptyConfiguration().governance.votingDefaults,
      shareTransfers: 'OWNER_CONSENT',
    },
    document: {},
  };
}
describe('universal company formation and authority', () => {
  it('supports shareholder government without a mandatory director or business type', () => {
    const draft = CompanyConfigurationSchema.parse(configuration());
    expect(() => {
      assertCompanyFormation(draft);
    }).not.toThrow();
    expect(draft.charter.offices).toEqual([]);
    const procedure = companyProcedure(draft.charter, 'AMEND_CHARTER');
    const requirements = companyRequirements(crypto.randomUUID(), draft.charter, procedure);
    expect(requirements.approvalGroups).toEqual([]);
    expect(requirements.votes[0]?.electorate.type).toBe('COMPANY_SHAREHOLDERS');
    expect(() => companyProcedure(draft.charter, 'TRANSFER_FUNDS')).toThrow('не настроено');
    expect(CompanyRegistrationPolicySchema.safeParse({}).success).toBe(false);
  });
  it('requires exact share conservation and rejects duplicate legal owners', () => {
    const draft = configuration();
    draft.allocations[0] = {
      owner: { type: 'STATE', id: crypto.randomUUID() },
      shares: '900719925474099311',
    };
    expect(() => {
      assertCompanyFormation(draft);
    }).toThrow('Акции');
    draft.totalShares = '1801439850948198622';
    const [owner] = draft.allocations;
    draft.allocations.push(owner);
    expect(() => {
      assertCompanyFormation(draft);
    }).toThrow('Акции');
  });
  it('selects exact currency-specific financial thresholds and requires authorization independently of shareholding', () => {
    const draft = configuration();
    const currencyId = crypto.randomUUID();
    const first = crypto.randomUUID();
    const second = crypto.randomUUID();
    const single: CompanyProcedure = {
      mechanism: 'SINGLE_OFFICE',
      officeIds: [first],
      vote: null,
      manualProcedure: {},
    };
    const joint: CompanyProcedure = {
      mechanism: 'MULTIPLE_OFFICES',
      officeIds: [first, second],
      vote: null,
      manualProcedure: {},
    };
    draft.charter.policies.push({
      action: 'TRANSFER_FUNDS',
      procedure: joint,
      financialBands: [{ currencyId, upToMinor: '900719925474099312', procedure: single }],
    });
    expect(
      companyProcedure(draft.charter, 'TRANSFER_FUNDS', {
        currencyId,
        amountMinor: '900719925474099312',
      }),
    ).toBe(single);
    expect(
      companyProcedure(draft.charter, 'TRANSFER_FUNDS', {
        currencyId,
        amountMinor: '900719925474099313',
      }),
    ).toBe(joint);
    expect(
      companyProcedure(draft.charter, 'TRANSFER_FUNDS', {
        currencyId: crypto.randomUUID(),
        amountMinor: '1',
      }),
    ).toBe(joint);
    expect(() => companyProcedure(draft.charter, 'TRANSFER_FUNDS')).toThrow('точная сумма');
  });
  it('refuses dangling office references, empty approvals and repeated corporate actions', () => {
    const draft = configuration();
    draft.charter.policies.push({
      action: 'TRANSFER_FUNDS',
      procedure: {
        mechanism: 'SINGLE_OFFICE',
        officeIds: [crypto.randomUUID()],
        vote: null,
        manualProcedure: {},
      },
      financialBands: [],
    });
    expect(() => {
      assertCompanyFormation(draft);
    }).toThrow('должности');
    draft.charter.policies.pop();
    draft.charter.policies.push({
      action: 'AMEND_CHARTER',
      procedure: shareholderVote,
      financialBands: [],
    });
    expect(() => {
      assertCompanyFormation(draft);
    }).toThrow('повторяться');
  });
});
