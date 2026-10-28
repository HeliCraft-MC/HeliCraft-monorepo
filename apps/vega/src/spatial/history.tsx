import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTerritoryHistory } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import styles from './spatial.module.scss';

function TerritoryHistory({
  worldId,
  stateId,
}: Readonly<{ worldId: string; stateId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['territory-history', worldId, stateId, page],
    queryFn: async () => {
      const result = await getTerritoryHistory({
        client: browserClient(),
        path: { worldId, stateId },
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const previous = useCallback((): void => {
    setPage((value) => Math.max(1, value - 1));
  }, []);
  const next = useCallback((): void => {
    setPage((value) => value + 1);
  }, []);
  return (
    <section className={styles.panel}>
      <h3>{uiText(locale, 'История границ', 'Boundary history')}</h3>
      {query.isPending && (
        <output>{uiText(locale, 'Загрузка истории…', 'Loading history…')}</output>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Опубликованных ревизий пока нет.', 'No published revisions yet.')}</p>
      )}
      {query.data?.items.map((revision) => (
        <article key={revision.id}>
          <strong>
            {uiText(locale, 'Ревизия', 'Revision')} {revision.number}
          </strong>
          <p>
            <time dateTime={revision.effectiveAt}>
              {new Date(revision.effectiveAt).toLocaleString(locale)}
            </time>{' '}
            · {revision.area.toLocaleString(locale)} {uiText(locale, 'блоков²', 'blocks²')}
          </p>
          <p>{displayText(revision.reason, locale)}</p>
          <p>
            {uiText(locale, 'Ратификация', 'Ratification')}: {revision.ratificationReason}
          </p>
          <p>
            <a href={`/players/${revision.createdBy}?lang=${locale}`}>
              {uiText(locale, 'Автор предложения', 'Proposal author')}
            </a>{' '}
            ·{' '}
            <a href={`/players/${revision.ratifiedBy}?lang=${locale}`}>
              {uiText(locale, 'Ратифицировал', 'Ratified by')}
            </a>
          </p>
        </article>
      ))}
      <div className={styles.toolbar}>
        <Button tone="quiet" onClick={previous} disabled={page === 1}>
          {uiText(locale, 'Назад', 'Previous')}
        </Button>
        <Button tone="quiet" onClick={next} disabled={query.data?.hasMore !== true}>
          {uiText(locale, 'Далее', 'Next')}
        </Button>
      </div>
    </section>
  );
}
export { TerritoryHistory };
