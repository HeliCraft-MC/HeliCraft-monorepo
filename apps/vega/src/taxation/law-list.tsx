import type { ReactElement, MouseEvent } from 'react';
import type { StateDetail, StateTaxation } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { economicAuthority, economicStatus } from './model';
import { TaxRuleSummary } from './rule-summary';
import styles from '../monetary/monetary.module.scss';

const PERCENT_BPS = 100;
function TaxLawList({
  data,
  state,
  actorId,
  onEdit,
}: Readonly<{
  data: StateTaxation;
  state: StateDetail;
  actorId: string;
  onEdit: (event: MouseEvent<HTMLButtonElement>) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const latest = data.laws.filter(
    (revision) =>
      !data.laws.some((other) => other.lawId === revision.lawId && other.number > revision.number),
  );
  return (
    <section className={styles.panel}>
      <h3>{uiText(locale, 'Налоговые законы', 'Tax laws')}</h3>
      {latest.length === 0 && (
        <p>{uiText(locale, 'Принятых законов пока нет.', 'No enacted laws yet.')}</p>
      )}
      {latest.map((revision) => (
        <article className={styles.card} key={revision.id}>
          <h4>
            <a href={`/tax-laws/${revision.lawId}`}>{displayText(revision.name, locale)}</a> · №{' '}
            {revision.number}
          </h4>
          <p>
            {economicStatus(locale, revision.status)} · {revision.rule.rateBps / PERCENT_BPS}% ·{' '}
            {revision.rule.category} · {new Date(revision.effectiveAt).toLocaleString(locale)}
          </p>
          <p>{displayText(revision.description, locale)}</p>
          <TaxRuleSummary rule={revision.rule} subject={revision.regimeSubject} />
          {revision.status !== 'REPEALED' && (
            <div className={styles.actions}>
              {economicAuthority(state, actorId, 'AMEND_TAX_LAW') && (
                <Button value={`AMEND_TAX_LAW:${revision.id}`} onClick={onEdit}>
                  {uiText(locale, 'Изменить закон', 'Amend law')}
                </Button>
              )}
              {economicAuthority(state, actorId, 'REPEAL_TAX_LAW') && (
                <Button tone="quiet" value={`REPEAL_TAX_LAW:${revision.id}`} onClick={onEdit}>
                  {uiText(locale, 'Отменить закон', 'Repeal law')}
                </Button>
              )}
            </div>
          )}
          <details>
            <summary>{uiText(locale, 'История редакций', 'Revision history')}</summary>
            {data.laws
              .filter((item) => item.lawId === revision.lawId)
              .map((item) => (
                <p key={item.id}>
                  № {item.number} · {economicStatus(locale, item.status)} ·{' '}
                  {item.rule.rateBps / PERCENT_BPS}% · {item.effectiveAt} · {item.id}
                </p>
              ))}
          </details>
        </article>
      ))}
    </section>
  );
}
export { TaxLawList };
