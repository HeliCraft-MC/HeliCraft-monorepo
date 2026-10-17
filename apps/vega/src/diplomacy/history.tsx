import { useCallback, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTreatyRevisionHistory } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { TreatyDecisionContent } from './decision-content';
import styles from '../monetary/monetary.module.scss';

function TreatyHistory({
  stateId,
  treatyId,
}: Readonly<{ stateId: string; treatyId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['treaty-revisions', stateId, treatyId, page],
    enabled: open,
    queryFn: async () => {
      const result = await getTreatyRevisionHistory({
        client: browserClient(),
        path: { stateId, id: treatyId },
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const toggle = useCallback((event: SyntheticEvent<HTMLDetailsElement>): void => {
    setOpen(event.currentTarget.open);
  }, []);
  return (
    <details onToggle={toggle}>
      <summary>
        {uiText(locale, 'Все редакции и история решений', 'All revisions and decision history')}
      </summary>
      {open && query.isPending && (
        <output>{uiText(locale, 'Загрузка истории…', 'Loading history…')}</output>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data?.items.map((revision) => (
        <article className={styles.card} key={revision.id}>
          <h4>
            {uiText(locale, 'Редакция', 'Revision')} № {revision.number} ·{' '}
            {new Date(revision.createdAt).toLocaleString(locale)}
          </h4>
          <TreatyDecisionContent content={revision.content} />
          <p>
            {revision.id} · {revision.contentHash}
          </p>
          {query.data.decisions
            .filter((decision) => decision.revisionId === revision.id)
            .map((decision) => (
              <p key={decision.directiveId}>
                {decision.stateId} · {decision.kind} · {decision.directiveId} ·{' '}
                {new Date(decision.createdAt).toLocaleString(locale)}
              </p>
            ))}
        </article>
      ))}
      {query.data !== undefined && (
        <MonetaryPagination page={page} hasMore={query.data.hasMore} onPage={setPage} />
      )}
    </details>
  );
}
export { TreatyHistory };
