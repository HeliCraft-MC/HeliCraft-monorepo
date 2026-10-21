import { describe, expect, it } from 'vitest';
import { accrueTaxes, ACCRUAL_DENOMINATOR } from '../src/modules/taxation/accrual';
import { calculateTaxes, percentage } from '../src/modules/taxation/engine';
import type { TaxCalculation, TaxClaim } from '../src/modules/taxation/contracts';

const senderId = crypto.randomUUID();
const currencyId = crypto.randomUUID();
const recipientId = crypto.randomUUID();
const stateId = crypto.randomUUID();
const lawId = crypto.randomUUID();
function calculation(amount = '1', rate = 500, revision = 1): TaxCalculation {
  const claim: TaxClaim = {
    lawId,
    revisionId: crypto.randomUUID(),
    revision,
    stateId,
    stateName: {},
    stateSlug: 'state',
    name: {},
    category: 'TRANSFER',
    taxpayer: 'SENDER',
    baseMinor: amount,
    rateBps: rate,
    beneficiary: { kind: 'TREASURY', ownerId: stateId },
    evidence: [],
    nationalAmountMinor: percentage(BigInt(amount), rate).toString(),
  };
  return calculateTaxes(
    { event: 'PLAYER_TRANSFER', currencyId, senderId, recipientId, principalMinor: amount },
    [claim],
    [],
  );
}
function remember(result: TaxCalculation, remainders: Map<string, string>): void {
  for (const allocation of result.charges.flatMap((charge) => charge.allocations)) {
    const { accrual } = allocation;
    if (!accrual) {
      throw new Error('Missing exact evidence');
    }
    expect(BigInt(accrual.remainderBefore) + BigInt(accrual.exactNumerator)).toBe(
      BigInt(allocation.amountMinor) * ACCRUAL_DENOMINATOR + BigInt(accrual.remainderAfter),
    );
    remainders.set(accrual.key, accrual.remainderAfter);
  }
}
describe('accumulated exact tax obligations', () => {
  it('collects the same tax for twenty tiny transfers and one combined payment despite changing counterparties', () => {
    const remainders = new Map<string, string>();
    let collected = 0n;
    for (let index = 0; index < 20; index += 1) {
      const result = accrueTaxes(
        { ...calculation(), recipientId: crypto.randomUUID() },
        remainders,
      );
      collected += BigInt(result.totalTaxMinor);
      remember(result, remainders);
    }
    expect(collected).toBe(1n);
    expect([...remainders.values()]).toEqual(['0']);
    expect(accrueTaxes(calculation('20'), new Map()).totalTaxMinor).toBe(collected.toString());
  });
  it('retains the exact obligation across rate, revision and category changes', () => {
    const remainders = new Map<string, string>();
    remember(accrueTaxes(calculation('1', 9900), remainders), remainders);
    const next = calculation('1', 100, 2);
    const result = accrueTaxes(
      {
        ...next,
        charges: next.charges.map((charge) =>
          Object.assign(charge, {
            claims: charge.claims.map((claim) => Object.assign(claim, { category: 'RENAMED' })),
          }),
        ),
      },
      remainders,
    );
    expect(result.totalTaxMinor).toBe('1');
    remember(result, remainders);
    expect([...remainders.values()]).toEqual(['0']);
  });
  it('retains a dormant creditor remainder when the approved recipient changes and resumes it on return', () => {
    const remainders = new Map<string, string>();
    remember(accrueTaxes(calculation('19'), remainders), remainders);
    const next = calculation();
    const bank = { kind: 'CENTRAL_BANK' as const, ownerId: crypto.randomUUID() };
    const changed = {
      ...next,
      charges: next.charges.map((charge) =>
        Object.assign(charge, {
          allocations: charge.allocations.map((allocation) =>
            Object.assign(allocation, { beneficiary: bank }),
          ),
        }),
      ),
    };
    const switched = accrueTaxes(changed, remainders);
    expect(switched.totalTaxMinor).toBe('0');
    remember(switched, remainders);
    const resumed = accrueTaxes(calculation(), remainders);
    expect(resumed.totalTaxMinor).toBe('1');
    remember(resumed, remainders);
    expect([...remainders.values()]).toEqual(['0', '5000000']);
  });
  it('rejects corrupt residuals and never accrues a treaty-exempt national claim', () => {
    const first = accrueTaxes(calculation(), new Map());
    const key = first.charges[0]?.allocations[0]?.accrual?.key;
    if (key === undefined) {
      throw new Error('Missing key');
    }
    expect(() =>
      accrueTaxes(calculation(), new Map([[key, ACCRUAL_DENOMINATOR.toString()]])),
    ).toThrow('остаток');
    const exempt = calculation('100');
    const result = accrueTaxes(
      {
        ...exempt,
        charges: exempt.charges.map((charge) => Object.assign(charge, { exempt: true })),
      },
      new Map(),
    );
    expect(result.totalTaxMinor).toBe('0');
    expect(result.charges[0]?.allocations[0]?.accrual?.exactNumerator).toBe('0');
  });
});
