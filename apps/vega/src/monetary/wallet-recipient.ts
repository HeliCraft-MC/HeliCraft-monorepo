import type { PublishedCompanyIdentity, WalletTransfer } from '@helicraft/alhena';
import type { SelectedPlayer } from '../player-picker';
import { amountFromForm, formText } from './model';

type WalletRecipient =
  | { readonly kind: 'PLAYER'; readonly player: SelectedPlayer }
  | { readonly kind: 'COMPANY'; readonly company: PublishedCompanyIdentity };
function selectedWalletRecipient(
  kind: 'PLAYER' | 'COMPANY',
  players: readonly SelectedPlayer[],
  company: PublishedCompanyIdentity | null,
): WalletRecipient {
  if (kind === 'COMPANY') {
    if (company === null) {
      throw new Error('Select an actual company');
    }
    return { kind, company: structuredClone(company) };
  }
  const [player] = players;
  if (players.length !== 1 || player === undefined) {
    throw new Error('Select one actual player');
  }
  return { kind, player: structuredClone(player) };
}
function walletCommand(form: FormData, recipient: WalletRecipient): WalletTransfer {
  return {
    idempotencyKey: crypto.randomUUID(),
    currencyId: formText(form, 'currencyId'),
    recipientId: recipient.kind === 'PLAYER' ? recipient.player.id : recipient.company.id,
    ...(recipient.kind === 'COMPANY' ? { recipientType: recipient.kind } : {}),
    amountMinor: amountFromForm(form, 'amount'),
    purpose: formText(form, 'purpose'),
  };
}
export { selectedWalletRecipient, walletCommand, type WalletRecipient };
