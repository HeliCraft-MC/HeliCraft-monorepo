import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyShareHistory } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { CompanyOwnerIdentity } from './owner-identity';
import { ShareOperationSummary } from './share-operation-summary';

function CompanyShareHistory({
  companyId,
  actorId,
}: Readonly<{ companyId: string; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['company-share-history', companyId, actorId, page],
    queryFn: async () => {
      const result = await getCompanyShareHistory({
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
      <h2>{uiText(locale, 'История собственности', 'Ownership history')}</h2>
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Записей пока нет.', 'No entries yet.')}</p>
      )}
      <ol>
        {query.data?.items.map((event) => (
          <li key={event.id}>
            <time dateTime={event.createdAt}>
              {new Date(event.createdAt).toLocaleString(locale)}
            </time>{' '}
            · {event.shares}
            <ul>
              {event.postings.map((posting) => (
                <li key={`${posting.owner.type}:${posting.owner.id}`}>
                  <CompanyOwnerIdentity owner={posting.owner} />: {posting.delta}
                </li>
              ))}
            </ul>
            {event.operation !== null && (
              <details>
                <summary>
                  {uiText(locale, 'Условия передачи или выпуска', 'Transfer or issuance terms')}
                </summary>
                <ShareOperationSummary operation={event.operation} />
              </details>
            )}
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
export { CompanyShareHistory };
