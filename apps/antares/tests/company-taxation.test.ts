import { describe, expect, it } from 'vitest';
import type { TaxRule, TaxClaim } from '../src/modules/taxation/contracts';
import { TaxRuleSchema } from '../src/modules/taxation/contracts';
import {
  applyCompanyRegimes,
  ruleAppliesToTransfer,
  ruleAppliesToEvent,
} from '../src/modules/taxation/regimes';
import { transferEvent, calculationParty } from '../src/modules/taxation/participants';
import type { FinancialTransfer } from '../src/modules/taxation/participants';
import { resolvePartyJurisdiction } from '../src/modules/taxation/party-jurisdiction';
import { calculateTaxes } from '../src/modules/taxation/engine';
import type { ApplicableTreaty } from '../src/modules/taxation/engine';

const COMPANY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PLAYER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const HOME = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OTHER = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const BASE = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const rule: TaxRule = {
  event: 'COMPANY_PLAYER_TRANSFER',
  category: 'TRANSFER',
  taxpayer: 'SENDER',
  jurisdictions: ['COMPANY_REGISTRATION'],
  rateBps: 500,
  recipient: 'STATE_TREASURY',
  currencyIds: [],
};
const transfer: FinancialTransfer = {
  sender: { kind: 'COMPANY', id: COMPANY },
  recipient: { kind: 'PLAYER', id: PLAYER },
  currencyId: BASE,
  amountMinor: '10000',
  purpose: 'Ordinary payment',
};
function claim(stateId: string, category: string): TaxClaim {
  return {
    lawId: crypto.randomUUID(),
    revisionId: crypto.randomUUID(),
    revision: 1,
    stateId,
    stateName: {},
    stateSlug: 'test',
    name: {},
    category,
    taxpayer: 'SENDER',
    rateBps: 500,
    evidence: [],
    nationalAmountMinor: '500',
  };
}
// oxlint-disable-next-line max-lines-per-function -- Independent event, jurisdiction, regime and treaty cases retain their own assertions in one domain suite.
describe('typed corporate tax rules', () => {
  it('derives all four event types from actual legal parties', () => {
    const player = { kind: 'PLAYER' as const, id: PLAYER };
    const company = { kind: 'COMPANY' as const, id: COMPANY };
    expect(transferEvent(player, player)).toBe('PLAYER_TRANSFER');
    expect(transferEvent(player, company)).toBe('PLAYER_COMPANY_TRANSFER');
    expect(transferEvent(company, player)).toBe('COMPANY_PLAYER_TRANSFER');
    expect(transferEvent(company, company)).toBe('COMPANY_TRANSFER');
    expect(ruleAppliesToEvent(rule, 'PLAYER_TRANSFER')).toBe(false);
    expect(
      ruleAppliesToEvent(
        { ...rule, events: ['COMPANY_PLAYER_TRANSFER', 'COMPANY_TRANSFER'] },
        'COMPANY_TRANSFER',
      ),
    ).toBe(true);
    expect(TaxRuleSchema.safeParse({ ...rule, events: ['PLAYER_TRANSFER'] }).success).toBe(false);
  });
  it('never turns a player citizenship into company registration evidence', () => {
    expect(
      resolvePartyJurisdiction(HOME, rule, {
        party: transfer.recipient,
        memberships: [{ stateId: HOME, joinedAt: new Date(0) }],
        company: null,
        branch: null,
      }),
    ).toEqual([]);
    expect(
      resolvePartyJurisdiction(HOME, rule, {
        party: transfer.sender,
        memberships: [],
        company: { stateId: HOME, registeredAt: new Date(0).toISOString() },
        branch: null,
      }),
    ).toEqual([
      {
        stateId: HOME,
        basis: 'COMPANY_REGISTRATION',
        source: 'COMPANY_REGISTRATION',
        companyId: COMPANY,
        registeredAt: new Date(0).toISOString(),
      },
    ]);
  });
  it('replaces only the exact national obligation and retains independent additional and foreign claims', () => {
    const base = { id: BASE, stateId: HOME, rule };
    const replacement = {
      id: 'replacement',
      stateId: HOME,
      rule: {
        ...rule,
        rateBps: 200,
        regime: { companyId: COMPANY, branchId: null, mode: 'REPLACE' as const, targetLawId: BASE },
      },
    };
    const additional = {
      id: 'additional',
      stateId: HOME,
      rule: {
        ...rule,
        regime: {
          companyId: COMPANY,
          branchId: null,
          mode: 'ADDITIONAL' as const,
          targetLawId: null,
        },
      },
    };
    const foreign = { id: 'foreign', stateId: OTHER, rule };
    expect(applyCompanyRegimes([base, replacement, additional, foreign])).toEqual([
      { base, applied: replacement },
      { base: additional, applied: additional },
      { base: foreign, applied: foreign },
    ]);
    expect(
      applyCompanyRegimes([
        foreign,
        {
          ...replacement,
          rule: {
            ...replacement.rule,
            regime: { ...replacement.rule.regime, targetLawId: 'foreign' },
          },
        },
      ]),
    ).toEqual([{ base: foreign, applied: foreign }]);
  });
  it('does not extend a parent exemption to a subsidiary, a different payer or an unverified branch context', () => {
    const regime: NonNullable<TaxRule['regime']> = {
      companyId: COMPANY,
      branchId: null,
      mode: 'EXEMPT',
      targetLawId: BASE,
    };
    const exemption: TaxRule = { ...rule, rateBps: 0, regime };
    expect(ruleAppliesToTransfer(exemption, transfer)).toBe(true);
    expect(
      ruleAppliesToTransfer(exemption, { ...transfer, sender: { kind: 'COMPANY', id: OTHER } }),
    ).toBe(false);
    expect(ruleAppliesToTransfer({ ...exemption, taxpayer: 'RECIPIENT' }, transfer)).toBe(false);
    const scoped: TaxRule = { ...exemption, regime: { ...regime, branchId: OTHER } };
    expect(ruleAppliesToTransfer(scoped, transfer)).toBe(false);
    expect(ruleAppliesToTransfer(scoped, { ...transfer, sourceBranchId: OTHER })).toBe(true);
  });
  it('rejects overlapping replacements instead of double-collecting or silently choosing a lower rate', () => {
    const base = { id: BASE, stateId: HOME, rule };
    const replacement = {
      id: 'first',
      stateId: HOME,
      rule: {
        ...rule,
        regime: { companyId: COMPANY, branchId: null, mode: 'REPLACE' as const, targetLawId: BASE },
      },
    };
    expect(() =>
      applyCompanyRegimes([base, replacement, { ...replacement, id: 'second' }]),
    ).toThrow('несовместимые');
  });
  it('applies treaty category mapping and event scope to the already resolved national claims', () => {
    const treaty: ApplicableTreaty = {
      id: OTHER,
      revisionId: PLAYER,
      parties: [HOME, OTHER],
      content: {
        name: {},
        description: {},
        document: {},
        type: 'TAX_TREATY',
        event: 'COMPANY_PLAYER_TRANSFER',
        category: 'TRANSFER',
        categoryMapping: { firstCategory: 'INCOME', secondCategory: 'TRANSFER' },
        taxpayerScope: 'OVERLAPPING_NATIONAL_CLAIMS',
        terms: { mode: 'EXCLUSIVE', taxingStateId: HOME },
        effectiveAt: new Date(0).toISOString(),
        expiresAt: null,
        termination: 'BILATERAL',
      },
    };
    const event = {
      event: 'COMPANY_PLAYER_TRANSFER' as const,
      senderId: COMPANY,
      senderKind: 'COMPANY' as const,
      recipientId: PLAYER,
      recipientKind: 'PLAYER' as const,
      currencyId: BASE,
      principalMinor: '10000',
    };
    const foreign = claim(OTHER, 'TRANSFER');
    const claims = [claim(HOME, 'INCOME'), foreign];
    const calculation = calculateTaxes(event, claims, [treaty]);
    expect(calculation.totalTaxMinor).toBe('500');
    expect(calculationParty(calculation, 'SENDER')).toEqual(transfer.sender);
    expect(
      calculateTaxes(event, claims, [
        { ...treaty, content: { ...treaty.content, event: 'PLAYER_TRANSFER' } },
      ]).totalTaxMinor,
    ).toBe('1000');
    expect(calculateTaxes(event, [claim(HOME, 'TRANSFER'), foreign], [treaty]).totalTaxMinor).toBe(
      '1000',
    );
  });
});
