import type { ReactElement } from 'react';
import type { TreatyContent } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

const PERCENT_BPS = 100;
const BASIS_POINTS = 10_000;
function TreatyDecisionContent({ content }: Readonly<{ content: TreatyContent }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section>
      <h3>{displayText(content.name, locale)}</h3>
      <p>{displayText(content.description, locale)}</p>
      <p>
        {uiText(locale, 'Область действия', 'Scope')}: {content.category} ·{' '}
        {uiText(
          locale,
          'Личные переводы при налоговых требованиях обеих сторон',
          'Personal transfers with national claims from both parties',
        )}
      </p>
      {content.terms.mode === 'SHARED' ? (
        <p>
          {uiText(locale, 'Общая ставка и доли сторон', 'Shared rate and party shares')}:{' '}
          {content.terms.rateBps / PERCENT_BPS}% · {content.terms.firstShareBps / PERCENT_BPS}% /{' '}
          {(BASIS_POINTS - content.terms.firstShareBps) / PERCENT_BPS}%
        </p>
      ) : (
        <p>
          {uiText(locale, 'Исключительное право государства', 'Exclusive taxing state')}:{' '}
          {content.terms.taxingStateId}
        </p>
      )}
      <p>
        {uiText(locale, 'Вступление в силу', 'Effective date')}:{' '}
        {new Date(content.effectiveAt).toLocaleString(locale)} ·{' '}
        {uiText(locale, 'Окончание действия', 'Expiry')}:{' '}
        {content.expiresAt === null
          ? uiText(locale, 'Без срока', 'No expiry')
          : new Date(content.expiresAt).toLocaleString(locale)}
      </p>
      <p>
        {uiText(
          locale,
          'Прекращение требует утверждения обеих сторон.',
          'Termination requires both parties’ approval.',
        )}
      </p>
      <pre>{displayText(content.document, locale)}</pre>
    </section>
  );
}
export { TreatyDecisionContent };
