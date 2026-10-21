import { describe, expect, it } from 'vitest';
import type { PublishedCompanyIdentity } from '@helicraft/alhena';
import { composePayload } from '../src/monetary/compose-payload';

function company(): PublishedCompanyIdentity {
  return {
    id: crypto.randomUUID(),
    registrationStateId: crypto.randomUUID(),
    registrationStateName: { en: 'Foreign host' },
    name: { en: 'Recipient' },
    description: {},
    status: 'ACTIVE',
    foundedAt: new Date(0).toISOString(),
  };
}
function form(): FormData {
  const result = new FormData();
  result.set('amount', '9007199254740993.12');
  result.set('purpose', 'Authorized funding');
  result.set('recipientType', 'COMPANY');
  return result;
}
describe('official corporate recipient', () => {
  it('preserves exact money and the selected immutable company ID through review composition', () => {
    const selected = company();
    const currencyId = crypto.randomUUID();
    expect(
      composePayload({
        kind: 'BANK_TRANSFER',
        form: form(),
        name: {},
        description: {},
        currencyId,
        players: [],
        company: selected,
      }),
    ).toEqual({
      kind: 'BANK_TRANSFER',
      currencyId,
      amountMinor: '900719925474099312',
      purpose: 'Authorized funding',
      recipient: { type: 'COMPANY', companyId: selected.id },
    });
  });
  it('requires a real selected company and never falls back to a previously selected player', () => {
    const player = { id: crypto.randomUUID(), name: 'PreviousRecipient' };
    expect(() =>
      composePayload({
        kind: 'TREASURY_TRANSFER',
        form: form(),
        name: {},
        description: {},
        currencyId: crypto.randomUUID(),
        players: [player],
      }),
    ).toThrow('registered company');
  });
  it('rejects an unsupported recipient type instead of silently using a player', () => {
    const input = form();
    input.set('recipientType', 'ISSUANCE');
    expect(() =>
      composePayload({
        kind: 'BANK_TRANSFER',
        form: input,
        name: {},
        description: {},
        currencyId: crypto.randomUUID(),
        players: [{ id: crypto.randomUUID(), name: 'Unrelated' }],
        company: company(),
      }),
    ).toThrow('supported recipient');
  });
});
