import { describe, expect, it } from 'vitest';
import { calculateTaxes, percentage } from '../src/modules/taxation/engine';
import type { ApplicableTreaty } from '../src/modules/taxation/engine';
import { resolveJurisdiction } from '../src/modules/taxation/jurisdiction';
import type { TaxClaim, TaxRule } from '../src/modules/taxation/contracts';
import { TaxRuleSchema } from '../src/modules/taxation/contracts';
import { MAX_MINOR } from '../src/modules/monetary/domain';

const first = crypto.randomUUID();
const second = crypto.randomUUID();
const third = crypto.randomUUID();
const event = {
  event: 'PLAYER_TRANSFER' as const,
  currencyId: crypto.randomUUID(),
  senderId: crypto.randomUUID(),
  recipientId: crypto.randomUUID(),
  principalMinor: '10000',
};
const rule: TaxRule = {
  event: 'PLAYER_TRANSFER',
  category: 'TRANSFER',
  taxpayer: 'SENDER',
  jurisdictions: ['CITIZENSHIP', 'TERRITORIAL'],
  recipient: 'STATE_TREASURY',
  rateBps: 500,
  currencyIds: [],
};
function claim(stateId: string, bps: number, principalMinor = event.principalMinor): TaxClaim {
  return {
    lawId: crypto.randomUUID(),
    revisionId: crypto.randomUUID(),
    revision: 1,
    stateId,
    stateName: { en: stateId },
    stateSlug: stateId,
    name: { en: 'Transfer law' },
    category: 'TRANSFER',
    rateBps: bps,
    evidence: [],
    nationalAmountMinor: percentage(BigInt(principalMinor), bps).toString(),
  };
}
function treaty(
  terms: ApplicableTreaty['content']['terms'],
  participants: readonly [string, string] = [first, second],
): ApplicableTreaty {
  return {
    id: crypto.randomUUID(),
    revisionId: crypto.randomUUID(),
    parties: participants,
    content: {
      name: { en: 'Tax agreement' },
      description: {},
      document: {},
      type: 'TAX_TREATY',
      event: 'PLAYER_TRANSFER',
      category: 'TRANSFER',
      taxpayerScope: 'OVERLAPPING_NATIONAL_CLAIMS',
      terms,
      effectiveAt: '2026-10-17T00:00:00.000Z',
      expiresAt: null,
      termination: 'BILATERAL',
    },
  };
}
describe('exact event taxation', () => {
  it('adds independent laws on the original base and deduplicates jurisdiction matches', () => {
    const law = claim(first, 500);
    const result = calculateTaxes(event, [law, law, claim(first, 200), claim(second, 300)], []);
    expect(result.charges).toHaveLength(3);
    expect(result.totalTaxMinor).toBe('1000');
    expect(result.totalDebitMinor).toBe('11000');
  });
  it('resolves multiple territorial proxies without asserting physical geography', () => {
    const memberships = [
      { stateId: first, joinedAt: new Date(0) },
      { stateId: second, joinedAt: new Date(0) },
    ];
    expect(resolveJurisdiction(first, rule, memberships).map((item) => item.source)).toEqual([
      'CITIZENSHIP',
      'CITIZENSHIP_PROXY',
    ]);
    expect(resolveJurisdiction(second, rule, memberships)).toHaveLength(2);
    expect(resolveJurisdiction(third, rule, memberships)).toEqual([]);
  });
  it('floors rates exactly including zero, tiny amounts and the maximum amount', () => {
    expect(percentage(1n, 9999)).toBe(0n);
    expect(percentage(199n, 500)).toBe(9n);
    expect(percentage(MAX_MINOR, 10_000)).toBe(MAX_MINOR);
    expect(percentage(MAX_MINOR, 1)).toBe(MAX_MINOR / 10_000n);
    expect(() => percentage(1n, 0.1)).toThrow();
    expect(() => percentage(1n, 10_001)).toThrow();
    expect(() => percentage(MAX_MINOR + 1n, 1)).toThrow();
    expect(
      calculateTaxes({ ...event, principalMinor: '1' }, [claim(first, 1, '1')], []).charges[0]
        ?.amountMinor,
    ).toBe('0');
  });
  it('rejects total-debit overflow and unsupported events or jurisdiction declarations', () => {
    expect(() =>
      calculateTaxes(
        { ...event, principalMinor: MAX_MINOR.toString() },
        [claim(first, 1, MAX_MINOR.toString())],
        [],
      ),
    ).toThrow('диапазон');
    expect(TaxRuleSchema.safeParse({ ...rule, event: 'ISSUE' }).success).toBe(false);
    expect(TaxRuleSchema.safeParse({ ...rule, jurisdictions: ['TAX_RESIDENCY'] }).success).toBe(
      false,
    );
    expect(
      TaxRuleSchema.safeParse({ ...rule, jurisdictions: ['CITIZENSHIP', 'CITIZENSHIP'] }).success,
    ).toBe(false);
  });
});
describe('bilateral treaty calculation', () => {
  it('exempts only the nonexclusive party and preserves third-state claims', () => {
    const result = calculateTaxes(
      event,
      [claim(first, 500), claim(second, 300), claim(third, 200)],
      [treaty({ mode: 'EXCLUSIVE', taxingStateId: first })],
    );
    expect(result.totalTaxMinor).toBe('700');
    expect(result.charges.find((item) => item.claims[0]?.stateId === second)?.amountMinor).toBe(
      '0',
    );
  });
  it('replaces all overlapping category laws with one shared rate and preserves other categories', () => {
    const result = calculateTaxes(
      event,
      [
        claim(first, 500),
        claim(first, 200),
        claim(second, 300),
        claim(third, 200),
        { ...claim(first, 100), category: 'OTHER' },
      ],
      [treaty({ mode: 'SHARED', rateBps: 600, firstShareBps: 5000 })],
    );
    const shared = result.charges.find((item) => item.mode === 'SHARED');
    expect(shared?.claims).toHaveLength(3);
    expect(shared?.allocations.map((item) => item.amountMinor)).toEqual(['300', '300']);
    expect(result.totalTaxMinor).toBe('900');
  });
  it.each([0, 3333, 5000, 10_000])('conserves odd minor units at share %i', (share) => {
    const base = '101';
    const result = calculateTaxes(
      { ...event, principalMinor: base },
      [claim(first, 500, base), claim(second, 300, base)],
      [treaty({ mode: 'SHARED', rateBps: 500, firstShareBps: share })],
    );
    expect(
      result.charges[0]?.allocations.reduce((sum, item) => sum + BigInt(item.amountMinor), 0n),
    ).toBe(5n);
  });
  it('creates no new right when only one party has an applicable national claim', () => {
    const result = calculateTaxes(
      event,
      [claim(first, 500)],
      [treaty({ mode: 'SHARED', rateBps: 600, firstShareBps: 5000 })],
    );
    expect(result.totalTaxMinor).toBe('500');
    expect(result.charges[0]?.mode).toBe('NATIONAL');
  });
  it('fails deterministically on intersecting treaties regardless of input order', () => {
    const agreements = [
      treaty({ mode: 'SHARED', rateBps: 600, firstShareBps: 5000 }),
      treaty({ mode: 'EXCLUSIVE', taxingStateId: first }, [first, third]),
    ];
    const claims = [claim(first, 500), claim(second, 300), claim(third, 200)];
    expect(() => calculateTaxes(event, claims, agreements)).toThrow('противоречат');
    // oxlint-disable-next-line unicorn/no-array-reverse -- Reverse copied test inputs on the repository ES2022 target.
    expect(() => calculateTaxes(event, [...claims].reverse(), [...agreements].reverse())).toThrow(
      'противоречат',
    );
  });
});
