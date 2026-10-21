import type { ReactElement } from 'react';
import { MonetaryCompany } from './company';
import { useTranslation } from '../i18n';
import type { WalletRecipient } from './wallet-recipient';

function WalletRecipientSummary({
  recipient,
}: Readonly<{ recipient: WalletRecipient }>): ReactElement {
  const { text } = useTranslation();
  return (
    <p>
      {text('monetary.recipient')}:{' '}
      {recipient.kind === 'PLAYER' ? (
        recipient.player.name
      ) : (
        <MonetaryCompany id={recipient.company.id} initial={recipient.company} />
      )}
    </p>
  );
}
export { WalletRecipientSummary };
