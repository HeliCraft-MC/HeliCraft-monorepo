import type { ReactElement } from 'react';
import type { MonetaryDirectivePayload, PublishedCompanyIdentity } from '@helicraft/alhena';
import { MonetaryCompany } from './company';
import { MonetaryPlayer } from './player';
import { monetaryLabel } from './labels';
import { useTranslation } from '../i18n';

function FinancialRecipient({
  recipient,
  company,
}: Readonly<{
  recipient: Extract<MonetaryDirectivePayload, { kind: 'BANK_TRANSFER' }>['recipient'];
  company?: PublishedCompanyIdentity;
}>): ReactElement {
  const { text } = useTranslation();
  if (recipient.type === 'PLAYER') {
    return <MonetaryPlayer id={recipient.userId} />;
  }
  if (recipient.type === 'COMPANY') {
    return <MonetaryCompany id={recipient.companyId} initial={company} />;
  }
  return <span>{monetaryLabel(text, recipient.type)}</span>;
}
export { FinancialRecipient };
