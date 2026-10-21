import { economicStatus } from './model';
import type { ReactElement } from 'react';
import type { PublicTaxLawRevision } from '@helicraft/alhena';
import { MarkdownContent } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { TaxRuleSummary } from './rule-summary';
import styles from '../monetary/monetary.module.scss';

const PERCENT_BPS = 100;

function PublicLaw({ revision }: Readonly<{ revision: PublicTaxLawRevision }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <article className={styles.card}>
      <h2>
        <a href={`/tax-laws/${revision.lawId}`}>{displayText(revision.name, locale)}</a> · №{' '}
        {revision.number}
      </h2>
      <p>{displayText(revision.description, locale)}</p>
      <p>
        {economicStatus(locale, revision.status)} · {revision.rule.rateBps / PERCENT_BPS}% ·{' '}
        {revision.rule.category}
      </p>
      <p>
        {uiText(locale, 'Вступление в силу', 'Effective date')}:{' '}
        {new Date(revision.effectiveAt).toLocaleString(locale)}
      </p>
      <TaxRuleSummary rule={revision.rule} subject={revision.regimeSubject} />
      {revision.rule.jurisdictions.includes('TERRITORIAL') && (
        <p>
          {uiText(
            locale,
            'Территориальное основание временно определяется по гражданству. Физическое местоположение не проверяется.',
            'Territorial jurisdiction temporarily follows citizenship. Physical location is not verified.',
          )}
        </p>
      )}
      <MarkdownContent html={revision.documentHtml} />
    </article>
  );
}
export { PublicLaw };
