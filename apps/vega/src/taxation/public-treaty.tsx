import { TreatyParties } from '../diplomacy/parties';
import { economicStatus } from './model';
import type { ReactElement } from 'react';
import type { PublicTreaty } from '@helicraft/alhena';
import { MarkdownContent } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import styles from '../monetary/monetary.module.scss';
import { taxEventLabel } from './event-labels';

const PERCENT_BPS = 100;
const BASIS_POINTS = 10_000;

function PublicTreatyPage({ item }: Readonly<{ item: PublicTreaty }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section className={styles.panel}>
      <h1>{displayText(item.name, locale)}</h1>
      <p>{economicStatus(locale, item.status)}</p>
      <TreatyParties parties={item.parties} />
      {item.revisions.map((revision) => (
        <article className={styles.card} key={revision.id}>
          <h2>
            {uiText(locale, 'Редакция', 'Revision')} № {revision.number}
          </h2>
          <p>{displayText(revision.description, locale)}</p>
          <p>
            {taxEventLabel(revision.event, locale)} ·{' '}
            {revision.categoryMapping?.firstCategory ?? revision.category} ↔{' '}
            {revision.categoryMapping?.secondCategory ?? revision.category} ·{' '}
            {revision.terms.mode === 'SHARED'
              ? uiText(locale, 'Общая ставка с распределением', 'Shared tax rate')
              : uiText(locale, 'Исключительное право', 'Exclusive taxation')}{' '}
            · {new Date(revision.effectiveAt).toLocaleString(locale)}{' '}
            {revision.expiresAt === null
              ? ''
              : `— ${new Date(revision.expiresAt).toLocaleString(locale)}`}
          </p>
          {revision.terms.mode === 'SHARED' ? (
            <p>
              {revision.terms.rateBps / PERCENT_BPS}% · {revision.terms.firstShareBps / PERCENT_BPS}
              % / {(BASIS_POINTS - revision.terms.firstShareBps) / PERCENT_BPS}%
            </p>
          ) : (
            <p>
              {displayText(
                item.parties.find(
                  (party) =>
                    revision.terms.mode === 'EXCLUSIVE' &&
                    party.id === revision.terms.taxingStateId,
                )?.name ?? {},
                locale,
              )}
            </p>
          )}
          <p>
            {uiText(
              locale,
              'Договор урегулирует только совпадающие национальные требования сторон. Налоги третьих государств сохраняются.',
              'This treaty settles only overlapping national claims of its parties. Third-state taxes remain unchanged.',
            )}
          </p>
          <MarkdownContent html={revision.documentHtml} />
          <details>
            <summary>{uiText(locale, 'Проверяемая редакция', 'Verifiable revision')}</summary>
            <p>
              {revision.id} · {revision.contentHash}
            </p>
          </details>
        </article>
      ))}
    </section>
  );
}
export { PublicTreatyPage };
