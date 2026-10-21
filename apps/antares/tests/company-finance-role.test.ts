import { describe, expect, it } from 'vitest';
import { mayReadCompanyFinances } from '../src/modules/companies/finance-role';
import { officeCompanyConfiguration } from './companies-fixture';
import type { CurrentCompanyHolder } from '../src/modules/companies/decision-authority';

const actorId = crypto.randomUUID();
function fixture(): {
  charter: ReturnType<typeof officeCompanyConfiguration>['charter'];
  holder: CurrentCompanyHolder;
} {
  const { charter } = officeCompanyConfiguration(actorId, crypto.randomUUID());
  const [office] = charter.offices;
  if (!office) {
    throw new Error('Office missing');
  }
  return {
    charter,
    holder: {
      id: crypto.randomUUID(),
      officeId: office.id,
      userId: actorId,
      revisionId: crypto.randomUUID(),
      since: new Date(0),
      until: null,
    },
  };
}
describe('corporate financial read authority', () => {
  it('does not give a shareholder financial access when a separate office controls spending', () => {
    const { charter } = fixture();
    expect(mayReadCompanyFinances(charter, { actorId, shareholder: true, holders: [] })).toBe(
      false,
    );
  });
  it('allows the actual financial office holder and denies unrelated people', () => {
    const { charter, holder } = fixture();
    expect(
      mayReadCompanyFinances(charter, { actorId, shareholder: false, holders: [holder] }),
    ).toBe(true);
    expect(
      mayReadCompanyFinances(charter, {
        actorId: crypto.randomUUID(),
        shareholder: false,
        holders: [holder],
      }),
    ).toBe(false);
  });
  it('requires an explicit financial policy even for owners and holders of other powers', () => {
    const { charter, holder } = fixture();
    charter.policies = charter.policies.filter((policy) => policy.action !== 'TRANSFER_FUNDS');
    expect(mayReadCompanyFinances(charter, { actorId, shareholder: true, holders: [holder] })).toBe(
      false,
    );
  });
  it('allows a financial shareholder electorate only when the charter explicitly chooses it', () => {
    const { charter } = fixture();
    charter.policies = charter.policies.map((policy) =>
      policy.action === 'TRANSFER_FUNDS'
        ? {
            ...policy,
            procedure: {
              mechanism: 'SHAREHOLDER_VOTE',
              officeIds: [],
              vote: null,
              manualProcedure: {},
            },
          }
        : policy,
    );
    expect(mayReadCompanyFinances(charter, { actorId, shareholder: true, holders: [] })).toBe(true);
    expect(mayReadCompanyFinances(charter, { actorId, shareholder: false, holders: [] })).toBe(
      false,
    );
  });
});
