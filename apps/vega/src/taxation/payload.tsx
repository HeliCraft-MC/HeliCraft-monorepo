import type { ReactElement } from 'react';
import type { MonetaryDirectivePayload } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { economicLabels } from './model';

const PERCENT_BPS = 100;

function EconomicPayload({
  payload,
}: Readonly<{ payload: MonetaryDirectivePayload }>): ReactElement | null {
  const { locale } = useTranslation();
  const title = economicLabels[payload.kind];
  if (title === undefined) {
    return null;
  }
  return (
    <section>
      <h3>{uiText(locale, title[0], title[1])}</h3>
      {'rule' in payload && (
        <dl>
          <dt>{uiText(locale, 'Ставка от исходной суммы', 'Rate on original amount')}</dt>
          <dd>{payload.rule.rateBps / PERCENT_BPS}%</dd>
          <dt>{uiText(locale, 'Юрисдикция', 'Jurisdiction')}</dt>
          <dd>
            {payload.rule.jurisdictions
              .map((basis) =>
                basis === 'CITIZENSHIP'
                  ? uiText(locale, 'Гражданство', 'Citizenship')
                  : uiText(
                      locale,
                      'Территория — временно по гражданству',
                      'Territory — temporary citizenship proxy',
                    ),
              )
              .join(', ')}
          </dd>
          <dt>{uiText(locale, 'Категория', 'Category')}</dt>
          <dd>{payload.rule.category}</dd>
        </dl>
      )}
      {'effectiveAt' in payload && (
        <p>
          {uiText(locale, 'Вступление в силу', 'Effective date')}:{' '}
          {new Date(payload.effectiveAt).toLocaleString(locale)}
        </p>
      )}
      {'lawId' in payload && (
        <p>
          <a href={`/tax-laws/${payload.lawId}`}>
            {uiText(locale, 'Закон', 'Law')}: {payload.lawId}
          </a>
        </p>
      )}
      {'revisionId' in payload && (
        <p>
          {uiText(locale, 'Редакция договора', 'Treaty revision')}: {payload.revisionId} ·{' '}
          {payload.contentHash}
        </p>
      )}
      {'document' in payload && <pre>{displayText(payload.document, locale)}</pre>}
    </section>
  );
}
export { EconomicPayload };
