import { describe, expect, it } from 'vitest';
import type { PublishedCompanyIdentity } from '@helicraft/alhena';
import { selectedWalletRecipient, walletCommand } from '../src/monetary/wallet-recipient';

const company: PublishedCompanyIdentity = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  registrationStateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  registrationStateName: { en: 'Registered state' },
  status: 'ACTIVE',
  name: { en: 'Actual company' },
  description: {},
  foundedAt: new Date(0).toISOString(),
};
const player = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'ActualPlayer' };
function form(): FormData {
  const data = new FormData();
  data.set('currencyId', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  data.set('amount', '9007199254740993.12');
  data.set('purpose', 'An exact official payment');
  return data;
}
describe('wallet legal recipients', () => {
  it('requires an actual company selection and never falls back to an old player selection', () => {
    expect(() => selectedWalletRecipient('COMPANY', [player], null)).toThrow(
      'Select an actual company',
    );
    const input = walletCommand(form(), selectedWalletRecipient('COMPANY', [player], company));
    expect(input).toMatchObject({
      recipientId: company.id,
      recipientType: 'COMPANY',
      amountMinor: '900719925474099312',
      purpose: 'An exact official payment',
    });
  });
  it('preserves the personal transfer command shape for old idempotency semantics', () => {
    const input = walletCommand(form(), selectedWalletRecipient('PLAYER', [player], company));
    expect(input.recipientId).toBe(player.id);
    expect('recipientType' in input).toBe(false);
    expect(() => selectedWalletRecipient('PLAYER', [], company)).toThrow(
      'Select one actual player',
    );
  });
  it('freezes the selected identity and label while an asynchronous quote is pending', () => {
    const mutable = structuredClone(company);
    const snapshot = selectedWalletRecipient('COMPANY', [], mutable);
    mutable.name.en = 'A later label';
    expect(snapshot).toMatchObject({
      kind: 'COMPANY',
      company: { id: company.id, name: { en: 'Actual company' } },
    });
    expect(walletCommand(form(), snapshot).recipientId).toBe(company.id);
  });
});
