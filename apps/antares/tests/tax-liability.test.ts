import { describe, expect, it } from 'vitest';
import { taxBaseMinor } from '../src/modules/taxation/rule';
import { calculateTaxes, percentage } from '../src/modules/taxation/engine';
import type { ApplicableTreaty } from '../src/modules/taxation/engine';
import { TaxRuleSchema } from '../src/modules/taxation/contracts';
import type { TaxClaim } from '../src/modules/taxation/contracts';
import { MAX_MINOR } from '../src/modules/monetary/domain';

const event = {
  event: 'PLAYER_TRANSFER' as const,
  senderId: crypto.randomUUID(),
  recipientId: crypto.randomUUID(),
  currencyId: crypto.randomUUID(),
  principalMinor: '30000',
};
function claim(taxpayer: 'SENDER' | 'RECIPIENT', base = '30000', bps = 500): TaxClaim {
  return {
    lawId: crypto.randomUUID(),
    revisionId: crypto.randomUUID(),
    revision: 1,
    stateId: crypto.randomUUID(),
    stateName: {},
    stateSlug: 'state',
    name: {},
    category: 'TRANSFER',
    taxpayer,
    baseMinor: base,
    rateBps: bps,
    nationalAmountMinor: percentage(BigInt(base), bps).toString(),
    evidence: [],
  };
}
describe('tax liability and allowances', () => {
  it('preserves historical full-base laws and computes exact excess without Number conversion', () => {
    expect(taxBaseMinor(30_000n, {})).toBe(30_000n);
    expect(taxBaseMinor(30_000n, { base: { kind: 'EXCESS', thresholdMinor: '10000' } })).toBe(
      20_000n,
    );
    expect(taxBaseMinor(10_000n, { base: { kind: 'EXCESS', thresholdMinor: '10000' } })).toBe(0n);
    expect(taxBaseMinor(10n, { base: { kind: 'EXCESS', thresholdMinor: '10000' } })).toBe(0n);
    expect(taxBaseMinor(MAX_MINOR, { base: { kind: 'EXCESS', thresholdMinor: '1' } })).toBe(
      MAX_MINOR - 1n,
    );
    expect(() => taxBaseMinor(-1n, {})).toThrow();
    expect(() => taxBaseMinor(MAX_MINOR + 1n, {})).toThrow();
  });
  it('combines sender surcharge with recipient withholding and conserves the entire payment', () => {
    const result = calculateTaxes(event, [claim('SENDER'), claim('RECIPIENT', '20000')], []);
    expect(result.totalTaxMinor).toBe('2500');
    expect(result.totalDebitMinor).toBe('31500');
    expect(result.recipientCreditMinor).toBe('29000');
    expect(BigInt(result.recipientCreditMinor ?? '0') + BigInt(result.totalTaxMinor)).toBe(
      BigInt(result.totalDebitMinor),
    );
    expect(result.charges.map((charge) => charge.baseMinor)).toEqual(
      expect.arrayContaining(['20000', '30000']),
    );
  });
  it('withholds no more than this payment even when the recipient already owns money', () => {
    expect(() =>
      calculateTaxes(
        event,
        [claim('RECIPIENT', '30000', 10_000), claim('RECIPIENT', '30000', 1)],
        [],
      ),
    ).toThrow('превышают');
    const result = calculateTaxes(event, [claim('RECIPIENT', '30000', 10_000)], []);
    expect(result.totalDebitMinor).toBe('30000');
    expect(result.recipientCreditMinor).toBe('0');
  });
  it('rejects malformed allowance and recipient declarations without changing legacy defaults', () => {
    const rule = {
      event: 'PLAYER_TRANSFER',
      category: 'TRANSFER',
      taxpayer: 'SENDER',
      jurisdictions: ['CITIZENSHIP'],
      rateBps: 500,
      recipient: 'STATE_TREASURY',
      currencyIds: [],
    };
    expect(TaxRuleSchema.parse(rule).base).toBeUndefined();
    expect(
      TaxRuleSchema.safeParse({
        ...rule,
        taxpayer: 'RECIPIENT',
        recipient: 'CENTRAL_BANK',
        base: { kind: 'EXCESS', thresholdMinor: '0' },
      }).success,
    ).toBe(true);
    for (const thresholdMinor of ['-1', '1.1', '01', '1e6', '9'.repeat(31)]) {
      expect(
        TaxRuleSchema.safeParse({ ...rule, base: { kind: 'EXCESS', thresholdMinor } }).success,
      ).toBe(false);
    }
    expect(TaxRuleSchema.safeParse({ ...rule, recipient: 'ARBITRARY_ACCOUNT' }).success).toBe(
      false,
    );
  });
});
describe('treaty liability separation', () => {
  it('does not combine taxes owed by different legal taxpayers', () => {
    const sender = claim('SENDER');
    const recipient = claim('RECIPIENT');
    const treaty: ApplicableTreaty = {
      id: crypto.randomUUID(),
      revisionId: crypto.randomUUID(),
      parties: [sender.stateId, recipient.stateId],
      content: {
        name: {},
        description: {},
        document: {},
        type: 'TAX_TREATY',
        event: 'PLAYER_TRANSFER',
        category: 'TRANSFER',
        taxpayerScope: 'OVERLAPPING_NATIONAL_CLAIMS',
        terms: { mode: 'SHARED', rateBps: 100, firstShareBps: 5000 },
        effectiveAt: new Date(0).toISOString(),
        expiresAt: null,
        termination: 'BILATERAL',
      },
    };
    const result = calculateTaxes(event, [sender, recipient], [treaty]);
    expect(result.charges.every((charge) => charge.mode === 'NATIONAL')).toBe(true);
    expect(result.totalTaxMinor).toBe('3000');
  });
});
