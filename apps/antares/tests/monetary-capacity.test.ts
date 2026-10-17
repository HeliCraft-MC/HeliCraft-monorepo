import { describe, expect, it } from 'vitest';
import { issuanceCapacity } from '../src/modules/monetary/capacity';
import { MAX_MINOR } from '../src/modules/monetary/domain';

const unlimited = {
  maxSupplyMinor: null,
  maxGrossIssuance30dMinor: null,
  maxIssuancePerOperationMinor: null,
};
describe('authoritative issuance capacity', () => {
  it('has no capacity before a policy is approved', () => {
    expect(issuanceCapacity(null, { supply: 0n, gross: 0n })).toBe(0n);
  });
  it('takes the smallest remaining state ceiling without losing precision', () => {
    const policy = {
      maxSupplyMinor: '1000',
      maxGrossIssuance30dMinor: '2000',
      maxIssuancePerOperationMinor: '90',
    };
    expect(issuanceCapacity(policy, { supply: 950n, gross: 1000n })).toBe(50n);
    expect(issuanceCapacity(policy, { supply: 0n, gross: 1980n })).toBe(20n);
    expect(issuanceCapacity(policy, { supply: 0n, gross: 0n })).toBe(90n);
  });
  it('retains the technical bound with disabled ceilings', () => {
    expect(issuanceCapacity(unlimited, { supply: 1n, gross: MAX_MINOR })).toBe(MAX_MINOR - 1n);
  });
  it('clamps capacity to zero when a newly lowered limit is already exceeded', () => {
    expect(
      issuanceCapacity({ ...unlimited, maxSupplyMinor: '1' }, { supply: 10n, gross: 10n }),
    ).toBe(0n);
    expect(
      issuanceCapacity({ ...unlimited, maxGrossIssuance30dMinor: '1' }, { supply: 0n, gross: 10n }),
    ).toBe(0n);
  });
});
