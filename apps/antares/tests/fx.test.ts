import { describe, expect, it } from 'vitest';
import { FxOfferTermsSchema, InterbankTermsSchema } from '../src/modules/fx/contracts';
import {
  assertOfferTerms,
  assertInterbankTerms,
  exactLotAmount,
  offerAmounts,
} from '../src/modules/fx/domain';

const first = crypto.randomUUID();
const second = crypto.randomUUID();
const future = '2099-01-01T00:00:00.000Z';
const terms = {
  receiveCurrencyId: first,
  provideCurrencyId: second,
  receivePerLotMinor: '200',
  providePerLotMinor: '100',
  totalLots: '1000',
  minimumLots: '1',
  expiresAt: future,
};
describe('exact atomic FX contracts', () => {
  it('uses whole lots without losing integers above the JavaScript precision boundary', () => {
    expect(exactLotAmount('9007199254740993', '3')).toBe('27021597764222979');
    expect(offerAmounts(terms, '7', '8')).toEqual({ receiveMinor: '1400', provideMinor: '700' });
    expect(() => offerAmounts(terms, '9', '8')).toThrow();
  });
  it('rejects zero, fractions, exponential notation and technical overflow', () => {
    for (const value of ['0', '-1', '0.5', '1e3', '01']) {
      expect(FxOfferTermsSchema.safeParse({ ...terms, providePerLotMinor: value }).success).toBe(
        false,
      );
    }
    expect(() => exactLotAmount('999999999999999999999999999999', '2')).toThrow();
    expect(() => {
      assertOfferTerms({ ...terms, minimumLots: '1001' });
    }).toThrow();
  });
  it('cannot disguise a one-currency transfer as an exchange or use expired terms', () => {
    expect(() => {
      assertOfferTerms({ ...terms, provideCurrencyId: first });
    }).toThrow();
    expect(() => {
      assertOfferTerms({ ...terms, expiresAt: '2000-01-01T00:00:00.000Z' });
    }).toThrow();
    const trade = InterbankTermsSchema.parse({
      first: {
        stateId: crypto.randomUUID(),
        bankId: crypto.randomUUID(),
        currencyId: first,
        amountMinor: '2',
      },
      second: {
        stateId: crypto.randomUUID(),
        bankId: crypto.randomUUID(),
        currencyId: second,
        amountMinor: '1',
      },
      expiresAt: future,
    });
    expect(() => {
      assertInterbankTerms(trade);
    }).not.toThrow();
    expect(() => {
      assertInterbankTerms({ ...trade, second: { ...trade.second, bankId: trade.first.bankId } });
    }).toThrow();
    expect(() => {
      assertInterbankTerms({ ...trade, second: { ...trade.second, currencyId: first } });
    }).toThrow();
  });
});
