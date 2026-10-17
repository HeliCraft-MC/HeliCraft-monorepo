import type { ReactElement } from 'react';
import type { TaxCalculation } from '@helicraft/alhena';
import { MoneyAmount, Alert } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import styles from '../monetary/monetary.module.scss';

const PERCENT_BPS = 100;

function TaxBreakdown({
  calculation,
  code,
}: Readonly<{ calculation: TaxCalculation; code: string }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section
      className={styles.panel}
      aria-label={uiText(locale, 'Расчёт налогов', 'Tax calculation')}
    >
      <p>
        {uiText(locale, 'Получатель получит полностью', 'Recipient receives in full')}:{' '}
        <MoneyAmount minor={calculation.principalMinor} code={code} locale={locale} />
      </p>
      <p>
        {uiText(locale, 'Всего налогов', 'Total tax')}:{' '}
        <MoneyAmount minor={calculation.totalTaxMinor} code={code} locale={locale} />
      </p>
      <strong>
        {uiText(locale, 'Всего спишется', 'Total debit')}:{' '}
        <MoneyAmount minor={calculation.totalDebitMinor} code={code} locale={locale} />
      </strong>
      {calculation.charges.length === 0 && (
        <p>{uiText(locale, 'Применимых налогов нет.', 'No applicable taxes.')}</p>
      )}
      {calculation.charges.map((charge) => (
        <article className={styles.card} key={charge.key}>
          <strong>
            {charge.mode === 'SHARED'
              ? displayText(charge.treatyName, locale)
              : displayText(charge.claims[0]?.name ?? {}, locale)}
          </strong>
          <p>
            {uiText(locale, 'Налог', 'Tax')}:{' '}
            <MoneyAmount minor={charge.amountMinor} code={code} locale={locale} /> ·{' '}
            {charge.rateBps / PERCENT_BPS}%
          </p>
          {charge.treatyId !== null && (
            <p>
              <a href={`/treaties/${charge.treatyId}`}>{displayText(charge.treatyName, locale)}</a>{' '}
              · {uiText(locale, 'Редакция', 'Revision')}: {charge.treatyRevisionId}
            </p>
          )}
          {charge.allocations.map((allocation) => {
            const claim = charge.claims.find((item) => item.stateId === allocation.stateId);
            return (
              <p key={allocation.stateId}>
                <a href={`/states/${claim?.stateSlug ?? ''}`}>
                  {displayText(claim?.stateName ?? {}, locale)}
                </a>
                : <MoneyAmount minor={allocation.amountMinor} code={code} locale={locale} /> ·{' '}
                {allocation.shareBps / PERCENT_BPS}%
              </p>
            );
          })}
          <details>
            <summary>{uiText(locale, 'Правовые основания', 'Legal basis')}</summary>
            {charge.claims.map((claim) => (
              <div key={claim.lawId}>
                <a href={`/tax-laws/${claim.lawId}`}>{displayText(claim.name, locale)}</a> · №{' '}
                {claim.revision} · {claim.rateBps / PERCENT_BPS}%
                <p>
                  {uiText(locale, 'Первоначальный налог', 'Original national tax')}:{' '}
                  <MoneyAmount minor={claim.nationalAmountMinor} code={code} locale={locale} />
                </p>
                {claim.evidence.map((evidence) => (
                  <p key={evidence.basis}>
                    {evidence.source === 'CITIZENSHIP'
                      ? uiText(locale, 'Гражданство', 'Citizenship')
                      : uiText(
                          locale,
                          'Территориальное основание: временно по гражданству',
                          'Territorial basis: temporary citizenship proxy',
                        )}
                  </p>
                ))}
              </div>
            ))}
          </details>
          {charge.mode === 'SHARED' && (
            <p>
              {uiText(
                locale,
                'Общая ставка заменяет перечисленные национальные налоги.',
                'The shared rate replaces the listed national taxes.',
              )}
            </p>
          )}
        </article>
      ))}
      {calculation.charges.some((charge) =>
        charge.claims.some((claim) =>
          claim.evidence.some((item) => item.source === 'CITIZENSHIP_PROXY'),
        ),
      ) && (
        <Alert>
          {uiText(
            locale,
            'До подключения игровой географии территориальная принадлежность временно определяется по гражданству. Фактическое местоположение игрока не проверяется.',
            'Until game geography is connected, territorial jurisdiction temporarily follows citizenship. Physical location is not verified.',
          )}
        </Alert>
      )}
    </section>
  );
}
export { TaxBreakdown };
