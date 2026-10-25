import type { ReactElement } from 'react';
import type { StateTaxation } from '@helicraft/alhena';
import { MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { TaxAssessments } from './assessments';
import styles from '../monetary/monetary.module.scss';

function TaxReceipts({ data }: Readonly<{ data: StateTaxation }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section className={styles.panel}>
      <TaxAssessments data={data} />
      <h3>{uiText(locale, 'Налоговые поступления', 'Tax receipts')}</h3>
      {data.totals.length === 0 && (
        <p>
          {uiText(locale, 'Начислений и поступлений пока нет.', 'No assessments or receipts yet.')}
        </p>
      )}
      {data.totals.map((total) => (
        <p key={total.currencyId}>
          <MoneyAmount
            minor={total.amountMinor}
            code={data.currencies.find((currency) => currency.id === total.currencyId)?.code ?? ''}
            locale={locale}
          />
        </p>
      ))}
      {data.receipts.map((receipt) => (
        <details key={receipt.journalId}>
          <summary>
            <MoneyAmount
              minor={receipt.amountMinor}
              code={
                data.currencies.find((currency) => currency.id === receipt.currencyId)?.code ?? ''
              }
              locale={locale}
            />{' '}
            · {new Date(receipt.createdAt).toLocaleString(locale)}
          </summary>
          <p>
            {uiText(locale, 'Начисление', 'Assessment')}: {receipt.assessmentId}
          </p>
          <p>
            {uiText(locale, 'Экономическая операция', 'Economic operation')}: {receipt.operationId}
          </p>
          <p>
            {uiText(locale, 'Проводка', 'Journal')}: {receipt.journalId}
          </p>
          {receipt.laws.map((law) => (
            <p key={law.revisionId}>
              <a href={`/tax-laws/${law.lawId}`}>{displayText(law.name, locale)}</a> · №{' '}
              {law.number} · {law.revisionId}
            </p>
          ))}
          {receipt.treatyId !== null && (
            <p>
              <a href={`/treaties/${receipt.treatyId}`}>
                {displayText(receipt.treatyName, locale)}
              </a>{' '}
              · {receipt.treatyRevisionId}
            </p>
          )}
        </details>
      ))}
    </section>
  );
}
export { TaxReceipts };
