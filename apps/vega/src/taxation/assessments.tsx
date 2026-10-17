import type { ReactElement } from 'react';
import type { StateTaxation } from '@helicraft/alhena';
import { MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import styles from '../monetary/monetary.module.scss';

function TaxAssessments({ data }: Readonly<{ data: StateTaxation }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section className={styles.panel}>
      <h3>{uiText(locale, 'Начисления и освобождения', 'Assessments and exemptions')}</h3>
      <p>
        {uiText(
          locale,
          'Нулевые суммы сохраняют правовые основания, но не создают денежных проводок.',
          'Zero amounts retain their legal basis without creating monetary postings.',
        )}
      </p>
      {data.assessments.length === 0 && (
        <p>{uiText(locale, 'Начислений пока нет.', 'No assessments yet.')}</p>
      )}
      {data.assessments.map((assessment) => (
        <details key={assessment.id}>
          <summary>
            <MoneyAmount
              minor={assessment.amountMinor}
              code={
                data.currencies.find((currency) => currency.id === assessment.currencyId)?.code ??
                ''
              }
              locale={locale}
            />{' '}
            · {new Date(assessment.createdAt).toLocaleString(locale)}
          </summary>
          <p>
            {uiText(locale, 'Налоговая база', 'Tax base')}:{' '}
            <MoneyAmount
              minor={assessment.baseMinor}
              code={
                data.currencies.find((currency) => currency.id === assessment.currencyId)?.code ??
                ''
              }
              locale={locale}
            />
          </p>
          <p>
            {uiText(locale, 'Начисление', 'Assessment')}: {assessment.id} ·{' '}
            {uiText(locale, 'Операция', 'Operation')}: {assessment.operationId}
          </p>
          {assessment.laws.map((law) => (
            <p key={law.revisionId}>
              <a href={`/tax-laws/${law.lawId}`}>{displayText(law.name, locale)}</a> · №{' '}
              {law.number} · {law.revisionId}
            </p>
          ))}
          {assessment.treatyId !== null && (
            <p>
              <a href={`/treaties/${assessment.treatyId}`}>
                {displayText(assessment.treatyName, locale)}
              </a>{' '}
              · {assessment.treatyRevisionId}
            </p>
          )}
        </details>
      ))}
    </section>
  );
}
export { TaxAssessments };
