import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCompanyLifecycleHistory } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { CompanyPlayerIdentity } from './player-identity';
import { companyStatusLabel } from './labels';

function CompanyLifecycleHistory({
  companyId,
  actorId,
}: Readonly<{ companyId: string; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['company-lifecycle', companyId, actorId, page],
    queryFn: async () => {
      const result = await listCompanyLifecycleHistory({
        client: browserClient(),
        path: { id: companyId },
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section>
      <h2>{uiText(locale, 'История статуса компании', 'Company status history')}</h2>
      {query.isPending && <p>{uiText(locale, 'Загрузка истории…', 'Loading history…')}</p>}
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Изменений пока нет.', 'No status changes yet.')}</p>
      )}
      <ol>
        {query.data?.items.map((event) => (
          <li key={event.id}>
            {companyStatusLabel(event.previousStatus, locale)} →{' '}
            {companyStatusLabel(event.status, locale)} ·{' '}
            <time dateTime={event.createdAt}>
              {new Date(event.createdAt).toLocaleString(locale)}
            </time>{' '}
            · <CompanyPlayerIdentity id={event.actorId} />
            <p>{event.reason}</p>
          </li>
        ))}
      </ol>
      {query.data !== undefined && (
        <MonetaryPagination page={query.data.page} hasMore={query.data.hasMore} onPage={setPage} />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { CompanyLifecycleHistory };
