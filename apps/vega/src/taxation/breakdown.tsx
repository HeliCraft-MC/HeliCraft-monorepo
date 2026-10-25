import type { ReactElement } from 'react';
import type { TaxCalculation } from '@helicraft/alhena';
import { Icon, MoneyAmount, Alert } from '@helicraft/atria';
import { StateName } from '../state-name';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import styles from '../monetary/monetary.module.scss';
import { TaxClaimEvidence } from './claim-evidence';
import { taxEventLabel } from './event-labels';

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
      <p>{taxEventLabel(calculation.event, locale)}</p>
      <p>
        {uiText(locale, 'Получатель получит', 'Recipient receives')}:{' '}
        <MoneyAmount
          minor={calculation.recipientCreditMinor ?? calculation.principalMinor}
          code={code}
          locale={locale}
        />
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
            {charge.taxpayer === 'RECIPIENT'
              ? uiText(locale, 'Удержание из перевода', 'Withheld from transfer')
              : uiText(locale, 'Дополнительно с отправителя', 'Charged to sender')}{' '}
            · {uiText(locale, 'Налог', 'Tax')}:{' '}
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
                {allocation.beneficiary?.kind === 'CENTRAL_BANK'
                  ? uiText(locale, 'Центральный банк', 'Central bank')
                  : uiText(locale, 'Казна', 'Treasury')}{' '}
                ·{' '}
                {claim === undefined ? (
                  uiText(locale, 'Государство недоступно', 'State unavailable')
                ) : (
                  <StateName
                    name={displayText(claim.stateName, locale)}
                    slug={claim.stateSlug}
                    href={`/states/${claim.stateSlug}`}
                    color="var(--primary)"
                  />
                )}
                : <MoneyAmount minor={allocation.amountMinor} code={code} locale={locale} /> ·{' '}
                {allocation.shareBps / PERCENT_BPS}%
                {allocation.accrual !== undefined && (
                  <small>
                    {' '}
                    ·{' '}
                    {uiText(
                      locale,
                      'Точный остаток минимальной единицы',
                      'Exact remainder of a minor unit',
                    )}
                    : {allocation.accrual.remainderBefore}/{allocation.accrual.denominator}{' '}
                    <Icon name="arrowRight" /> {allocation.accrual.remainderAfter}/
                    {allocation.accrual.denominator}
                  </small>
                )}
              </p>
            );
          })}
          <details>
            <summary>{uiText(locale, 'Правовые основания', 'Legal basis')}</summary>
            {charge.claims.map((claim) => (
              <TaxClaimEvidence key={claim.lawId} claim={claim} code={code} />
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
