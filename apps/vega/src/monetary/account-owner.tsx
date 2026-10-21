import type { ReactElement } from 'react';
import type { LedgerTransaction } from '@helicraft/alhena';
import { MonetaryCompany } from './company';
import { MonetaryPlayer } from './player';

function AccountOwner({
  account,
}: Readonly<{ account: LedgerTransaction['postings'][number]['account'] }>): ReactElement {
  if (account.kind === 'PLAYER') {
    return <MonetaryPlayer id={account.ownerId} />;
  }
  if (account.kind === 'COMPANY') {
    return <MonetaryCompany id={account.ownerId} />;
  }
  return <span>{account.ownerId}</span>;
}
export { AccountOwner };
