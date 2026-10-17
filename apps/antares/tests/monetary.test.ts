import { describe, expect, it } from 'vitest';
import { assertIssuance, MAX_MINOR, monetaryHash } from '../src/modules/monetary/domain';
import { MinorSchema, WalletTransferSchema } from '../src/modules/monetary/contracts';

const unlimited = {
  maxSupplyMinor: null,
  maxGrossIssuance30dMinor: null,
  maxIssuancePerOperationMinor: null,
};
describe('exact monetary domain', () => {
  it('requires approved policy and enforces each independently enabled ceiling', () => {
    const operation = { amount: 2n, supply: 9n, gross: 19n };
    expect(() => {
      assertIssuance(null, operation);
    }).toThrow('политику');
    for (const policy of [
      { ...unlimited, maxSupplyMinor: '10' },
      { ...unlimited, maxGrossIssuance30dMinor: '20' },
      { ...unlimited, maxIssuancePerOperationMinor: '1' },
    ]) {
      expect(() => {
        assertIssuance(policy, operation);
      }).toThrow('лимит');
    }
    expect(() => {
      assertIssuance(unlimited, operation);
    }).not.toThrow();
    expect(() => {
      assertIssuance(unlimited, { amount: 1n, supply: MAX_MINOR, gross: 0n });
    }).toThrow('диапазон');
  });
  it('keeps exact large integers and rejects ambiguous or floating amounts', () => {
    expect(MinorSchema.parse(MAX_MINOR.toString())).toBe(MAX_MINOR.toString());
    for (const invalid of ['01', '-1', '1.01', '1e4', ' 1', '1'.repeat(31)]) {
      expect(MinorSchema.safeParse(invalid).success).toBe(false);
    }
    const transfer = {
      idempotencyKey: crypto.randomUUID(),
      currencyId: crypto.randomUUID(),
      recipientId: crypto.randomUUID(),
      amountMinor: '0',
      purpose: '',
    };
    expect(WalletTransferSchema.safeParse(transfer).success).toBe(false);
    for (const amountMinor of ['abc', '-1', '1e4', '1.001', '01']) {
      expect(WalletTransferSchema.safeParse({ ...transfer, amountMinor }).success).toBe(false);
    }
  });
  it('binds significant payload and preserves hash across property order', () => {
    expect(monetaryHash({ amountMinor: '100', recipientId: 'A' })).toBe(
      monetaryHash({ recipientId: 'A', amountMinor: '100' }),
    );
    expect(monetaryHash({ amountMinor: '100', recipientId: 'A' })).not.toBe(
      monetaryHash({ amountMinor: '101', recipientId: 'A' }),
    );
  });
});
