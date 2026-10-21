import { describe, expect, it } from 'vitest';
import type { ShareIssue, ShareTransfer } from '../src/modules/companies/ownership-contracts';
import { ShareOperationSchema } from '../src/modules/companies/ownership-contracts';
import {
  assertShareSupply,
  controlsCompany,
  shareCommandHash,
  shareTermsHash,
  validateShareOperation,
} from '../src/modules/companies/share-domain';

function transfer(): ShareTransfer {
  return {
    kind: 'TRANSFER',
    operationId: crypto.randomUUID(),
    issuerId: crypto.randomUUID(),
    issuerRevisionId: crypto.randomUUID(),
    owner: { type: 'PLAYER', id: crypto.randomUUID() },
    recipient: { type: 'PLAYER', id: crypto.randomUUID() },
    shares: '9007199254740993',
  };
}
function issue(): ShareIssue {
  const lot = transfer();
  return {
    kind: 'ISSUE',
    operationId: lot.operationId,
    issuerId: lot.issuerId,
    issuerRevisionId: lot.issuerRevisionId,
    shares: '18014398509481985',
    allocations: [
      { owner: lot.owner, shares: '9007199254740993' },
      { owner: lot.recipient, shares: '9007199254740992' },
    ],
  };
}
describe('exact share operation terms', () => {
  it('preserves lots beyond the JavaScript integer limit and rejects noncanonical quantities', () => {
    const operation = issue();
    expect(validateShareOperation(operation)).toEqual(operation);
    for (const shares of ['0', '-1', '01', '1.5', '1e20', '1000000000000000000000000000000']) {
      expect(ShareOperationSchema.safeParse({ ...transfer(), shares }).success).toBe(false);
    }
  });
  it('requires exact issue conservation and one allocation per actual legal recipient', () => {
    const operation = issue();
    expect(() => validateShareOperation({ ...operation, shares: '18014398509481984' })).toThrow(
      'точно',
    );
    const [first] = operation.allocations;
    if (!first) {
      throw new Error('Allocation missing');
    }
    expect(() =>
      validateShareOperation({
        ...operation,
        shares: '18014398509481986',
        allocations: [first, first],
      }),
    ).toThrow('повторяющихся');
  });
  it('rejects a transfer to the same owner and any acquisition by the issuer itself', () => {
    const operation = transfer();
    expect(() => validateShareOperation({ ...operation, recipient: operation.owner })).toThrow(
      'другого',
    );
    expect(() =>
      validateShareOperation({
        ...operation,
        recipient: { type: 'COMPANY', id: operation.issuerId },
      }),
    ).toThrow('собственными');
    expect(() =>
      validateShareOperation({
        ...issue(),
        issuerId: operation.issuerId,
        allocations: [
          { owner: { type: 'COMPANY', id: operation.issuerId }, shares: '18014398509481985' },
        ],
      }),
    ).toThrow('собственными');
  });
  it('bounds resulting total supply exactly and leaves supply unchanged by transfers', () => {
    const operation = { ...issue(), shares: '1' };
    expect(() => {
      assertShareSupply('999999999999999999999999999998', operation);
    }).not.toThrow();
    expect(() => {
      assertShareSupply('999999999999999999999999999999', operation);
    }).toThrow('предел');
    expect(() => {
      assertShareSupply('999999999999999999999999999999', transfer());
    }).not.toThrow();
  });
  it('binds consent to the full immutable terms and settlement to the exact issuer approval', () => {
    const operation = transfer();
    const hash = shareTermsHash(operation);
    expect(shareTermsHash(structuredClone(operation))).toBe(hash);
    expect(shareTermsHash({ ...operation, shares: '9007199254740992' })).not.toBe(hash);
    expect(shareTermsHash({ ...operation, issuerRevisionId: crypto.randomUUID() })).not.toBe(hash);
    expect(shareTermsHash({ ...operation, recipient: operation.owner })).not.toBe(hash);
    expect(shareCommandHash(operation, crypto.randomUUID())).not.toBe(
      shareCommandHash(operation, null),
    );
    const issuance = issue();
    const [first, second] = issuance.allocations;
    if (!first || !second) {
      throw new Error('Issue allocations missing');
    }
    expect(shareTermsHash({ ...issuance, allocations: [second, first] })).not.toBe(
      shareTermsHash(issuance),
    );
  });
  it('computes strictly greater than half control without floating point rounding', () => {
    expect(controlsCompany('9007199254740993', '18014398509481985')).toBe(true);
    expect(controlsCompany('9007199254740992', '18014398509481985')).toBe(false);
    expect(controlsCompany('9007199254740993', '18014398509481986')).toBe(false);
    expect(controlsCompany('0', '0')).toBe(false);
  });
});
