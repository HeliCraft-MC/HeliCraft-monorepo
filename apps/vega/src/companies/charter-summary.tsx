import type { ReactElement } from 'react';
import type { CompanyCharter } from '@helicraft/alhena';
import { MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyProcedureSummary } from './procedure-summary';
import { CompanyPlayerIdentity } from './player-identity';
import { VotingSummary } from '../states/voting-summary';
import { CurrencyName } from './currency-name';
import { companyActionLabel } from './labels';

function CompanyCharterSummary({ charter }: Readonly<{ charter: CompanyCharter }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section>
      <VotingSummary rules={charter.votingDefaults} />
      <h3>{uiText(locale, 'Должности и полномочия', 'Offices and authority')}</h3>
      {charter.offices.map((office) => (
        <details key={office.id}>
          <summary>{displayText(office.name, locale)}</summary>
          <p>{displayText(office.description, locale)}</p>
          <p>
            {office.maxHolders} {uiText(locale, 'мест', 'positions')} ·{' '}
            {office.termDays ?? uiText(locale, 'бессрочно', 'indefinite')} ·{' '}
            {office.required
              ? uiText(locale, 'обязательная', 'required')
              : uiText(locale, 'необязательная', 'optional')}
          </p>
          <h4>{uiText(locale, 'Первоначальные назначения', 'Initial appointments')}</h4>
          <ul>
            {office.initialHolderIds.map((id) => (
              <li key={id}>
                <CompanyPlayerIdentity id={id} />
              </li>
            ))}
          </ul>
          <h4>{uiText(locale, 'Назначение', 'Appointment')}</h4>
          <CompanyProcedureSummary procedure={office.appointment} offices={charter.offices} />
          <h4>{uiText(locale, 'Освобождение', 'Removal')}</h4>
          <CompanyProcedureSummary procedure={office.removal} offices={charter.offices} />
        </details>
      ))}
      {charter.policies.map((policy) => (
        <details key={policy.action}>
          <summary>{companyActionLabel(policy.action, locale)}</summary>
          <CompanyProcedureSummary procedure={policy.procedure} offices={charter.offices} />
          {policy.financialBands.map((band) => (
            <section key={`${band.currencyId}:${band.upToMinor}`}>
              <p>
                {uiText(locale, 'Полное списание до', 'Full debit up to')}:{' '}
                <MoneyAmount minor={band.upToMinor} code="" locale={locale} />{' '}
                <CurrencyName id={band.currencyId} />
              </p>
              <CompanyProcedureSummary procedure={band.procedure} offices={charter.offices} />
            </section>
          ))}
        </details>
      ))}
      <p>
        {charter.shareTransfers === 'OWNER_CONSENT'
          ? uiText(
              locale,
              'Передача акций по согласию владельца и получателя.',
              'Share transfers require owner and recipient consent.',
            )
          : uiText(
              locale,
              'Для передачи акций также нужно корпоративное одобрение.',
              'Share transfers also require company approval.',
            )}
      </p>
    </section>
  );
}
export { CompanyCharterSummary };
