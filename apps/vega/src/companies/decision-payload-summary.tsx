// oxlint-disable import/max-dependencies -- Corporate decision review uses domain-specific human-readable projections and never exposes editable raw payloads.
import type { ReactElement } from 'react';
import type { CompanyDecisionPayload, CompanyCharter } from '@helicraft/alhena';
import { MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyOwnerIdentity } from './owner-identity';
import { CompanyRelatedDecisionSummary } from './related-decision-summary';
import { CompanyPlayerIdentity } from './player-identity';
import { CompanyRevisionSummary } from './revision-summary';
import { CompanyProcedureSummary } from './procedure-summary';
import { ShareOperationSummary } from './share-operation-summary';
import { CurrencyName } from './currency-name';

function CompanyDecisionPayloadSummary({
  payload,
  charter,
}: Readonly<{ payload: CompanyDecisionPayload; charter: CompanyCharter }>): ReactElement {
  const { locale } = useTranslation();
  if ('operation' in payload) {
    return <ShareOperationSummary operation={payload.operation} />;
  }
  if (payload.kind === 'TRANSFER_FUNDS') {
    return (
      <section>
        <MoneyAmount minor={payload.amountMinor} code="" locale={locale} />{' '}
        <CurrencyName id={payload.currencyId} />
        <p>
          {uiText(locale, 'Получатель', 'Recipient')}:{' '}
          <CompanyOwnerIdentity owner={payload.recipient} />
        </p>
        <p>{payload.purpose}</p>
        {payload.approvedDebitMinor !== undefined && (
          <p>
            {uiText(locale, 'Утверждаемое полное списание', 'Approved full debit')}:{' '}
            <MoneyAmount minor={payload.approvedDebitMinor} code="" locale={locale} />
          </p>
        )}
      </section>
    );
  }
  if (payload.kind === 'UPDATE_PROFILE') {
    return (
      <section>
        <h3>{displayText(payload.name, locale)}</h3>
        <p>{displayText(payload.description, locale)}</p>
        <p>{payload.categories.join(', ')}</p>
      </section>
    );
  }
  if (payload.kind === 'AMEND_CHARTER') {
    return <CompanyRevisionSummary content={payload.content} />;
  }
  if (payload.kind === 'CREATE_OFFICE' || payload.kind === 'UPDATE_OFFICE') {
    return (
      <section>
        <h3>{displayText(payload.office.name, locale)}</h3>
        <p>{displayText(payload.office.description, locale)}</p>
        <p>
          {payload.office.maxHolders} {uiText(locale, 'мест', 'positions')} ·{' '}
          {payload.office.termDays ?? uiText(locale, 'бессрочно', 'indefinite')}
        </p>
        <CompanyProcedureSummary procedure={payload.office.appointment} offices={charter.offices} />
        <CompanyProcedureSummary procedure={payload.office.removal} offices={charter.offices} />
      </section>
    );
  }
  if (payload.kind === 'APPOINT_OFFICE_HOLDER' || payload.kind === 'REMOVE_OFFICE_HOLDER') {
    return (
      <p>
        {displayText(
          charter.offices.find((office) => office.id === payload.officeId)?.name ?? {},
          locale,
        )}{' '}
        · <CompanyPlayerIdentity id={payload.userId} />
      </p>
    );
  }
  return <CompanyRelatedDecisionSummary payload={payload} />;
}
export { CompanyDecisionPayloadSummary };
