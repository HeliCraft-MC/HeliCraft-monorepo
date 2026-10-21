import { describe, expect, it } from 'vitest';
import { officeCompanyConfiguration } from './companies-fixture';
import type { CompanyRevisionContent } from '../src/modules/companies/contracts';
import type { CompanyDecisionPayload } from '../src/modules/companies/decision-contracts';
import { extractDecisionTexts, mapDecisionTexts } from '../src/modules/companies/decision-texts';
import {
  decisionProcedures,
  decisionRequirements,
} from '../src/modules/companies/decision-authority';
import { validateCharterAction } from '../src/modules/companies/charter-actions';
import { assertCompanyFormation } from '../src/modules/companies/domain';

function content(): CompanyRevisionContent {
  const { name, description, categories, charter, document } = officeCompanyConfiguration(
    crypto.randomUUID(),
    crypto.randomUUID(),
  );
  return { name, description, categories, charter, document };
}
// oxlint-disable-next-line max-lines-per-function -- The suite groups independent exact text, procedure composition and charter validation cases.
describe('corporate immutable decision domain', () => {
  it('round-trips every localized charter/procedure field through normalized decision references', () => {
    const revision = content();
    const [office] = revision.charter.offices;
    if (!office) {
      throw new Error('Office missing');
    }
    office.appointment.manualProcedure = {
      en: 'Appoint after review',
      ru: 'Назначить после проверки',
    };
    const policy = revision.charter.policies.find(
      (candidate) => candidate.action === 'TRANSFER_FUNDS',
    );
    if (!policy) {
      throw new Error('Financial policy missing');
    }
    policy.financialBands = [
      {
        currencyId: crypto.randomUUID(),
        upToMinor: '900719925474099312345',
        procedure: {
          mechanism: 'MANUAL',
          officeIds: [],
          vote: null,
          manualProcedure: { en: 'Review this exact currency threshold' },
        },
      },
    ];
    const payload: CompanyDecisionPayload = { kind: 'AMEND_CHARTER', content: revision };
    const stored = extractDecisionTexts(payload);
    expect(JSON.stringify(stored.machine)).not.toContain('Appoint after review');
    expect(JSON.stringify(stored.machine)).not.toContain('Review this exact currency threshold');
    expect(mapDecisionTexts(stored.machine, (path) => stored.texts.get(path) ?? {})).toEqual(
      payload,
    );
    expect(stored.texts.size).toBeGreaterThan(5);
  });
  it('combines the action policy with the actual office appointment and replacement procedures', () => {
    const revision = content();
    const [office] = revision.charter.offices;
    if (!office) {
      throw new Error('Office missing');
    }
    office.appointment = {
      mechanism: 'SHAREHOLDER_VOTE',
      officeIds: [],
      vote: { ...revision.charter.votingDefaults, thresholdKind: 'UNANIMOUS' },
      manualProcedure: {},
    };
    office.removal = {
      mechanism: 'MANUAL',
      officeIds: [],
      vote: null,
      manualProcedure: { en: 'Independent documented removal review' },
    };
    const procedures = decisionProcedures(revision.charter, {
      kind: 'APPOINT_OFFICE_HOLDER',
      officeId: office.id,
      userId: crypto.randomUUID(),
      replacedUserId: crypto.randomUUID(),
    });
    const requirements = decisionRequirements(crypto.randomUUID(), revision.charter, procedures);
    expect(requirements.approvalGroups).toEqual([{ mode: 'ALL', officeIds: [office.id] }]);
    expect(requirements.votes).toMatchObject([
      { electorate: { type: 'COMPANY_SHAREHOLDERS' }, rules: { thresholdKind: 'UNANIMOUS' } },
    ]);
    expect(requirements.manual).toBe(true);
  });
  it('deduplicates identical voting requirements without losing independent office approvals', () => {
    const revision = content();
    const [office] = revision.charter.offices;
    if (!office) {
      throw new Error('Office missing');
    }
    const procedure = {
      mechanism: 'COMBINED' as const,
      officeIds: [office.id],
      vote: null,
      manualProcedure: {},
    };
    const requirements = decisionRequirements(crypto.randomUUID(), revision.charter, [
      procedure,
      procedure,
    ]);
    expect(requirements.votes).toHaveLength(1);
    expect(requirements.approvalGroups).toHaveLength(2);
  });
  it('preserves the historical initial roster and refuses to assign a new person through charter text', () => {
    const revision = content();
    const next = structuredClone(revision);
    const [office] = next.charter.offices;
    if (!office) {
      throw new Error('Office missing');
    }
    office.initialHolderIds = [crypto.randomUUID()];
    expect(() => validateCharterAction(revision, { kind: 'AMEND_CHARTER', content: next })).toThrow(
      'отдельное решение',
    );
    expect(
      validateCharterAction(revision, {
        kind: 'UPDATE_PROFILE',
        name: { en: 'Renamed' },
        description: {},
        categories: [],
      }).charter,
    ).toEqual(revision.charter);
  });
  it('supports office-free shareholder governance and still requires initial officers for required formation offices', () => {
    const configuration = officeCompanyConfiguration(crypto.randomUUID(), crypto.randomUUID());
    const [office] = configuration.charter.offices;
    if (!office) {
      throw new Error('Office missing');
    }
    office.required = true;
    office.initialHolderIds = [];
    expect(() => {
      assertCompanyFormation(configuration);
    }).toThrow('первоначальные');
    const revision = content();
    const next: CompanyRevisionContent = {
      ...revision,
      charter: {
        ...revision.charter,
        offices: [],
        policies: [
          {
            action: 'UPDATE_PROFILE',
            procedure: {
              mechanism: 'SHAREHOLDER_VOTE',
              officeIds: [],
              vote: null,
              manualProcedure: {},
            },
            financialBands: [],
          },
        ],
      },
    };
    expect(
      validateCharterAction(revision, { kind: 'AMEND_CHARTER', content: next }).charter.offices,
    ).toEqual([]);
  });
});
