import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCompanyDecisions } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { companyActionLabel, companyStatusLabel } from './labels';

function CompanyDecisionsList({
  companyId,
  actorId,
}: Readonly<{ companyId: string; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['company-decisions', companyId, actorId, page],
    queryFn: async () => {
      const result = await listCompanyDecisions({
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
      <h2>{uiText(locale, 'Решения и одобрения', 'Decisions and approvals')}</h2>
      {query.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Решений пока нет.', 'No decisions yet.')}</p>
      )}
      <ol>
        {query.data?.items.map((decision) => (
          <li key={decision.id}>
            <a href={`/app/company-decisions/${decision.id}`}>
              {companyActionLabel(decision.kind, locale)}
            </a>{' '}
            · {companyStatusLabel(decision.status, locale)} ·{' '}
            <time dateTime={decision.createdAt}>
              {new Date(decision.createdAt).toLocaleString(locale)}
            </time>
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
export { CompanyDecisionsList };
