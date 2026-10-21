import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCompanyManualDecisions } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { MonetaryCompany } from '../monetary/company';

function AdminCompanyManualQueue(): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin-company-manual', page],
    queryFn: async () => {
      const result = await listCompanyManualDecisions({
        client: browserClient(),
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
    refetchInterval: 15_000,
  });
  return (
    <section>
      <h2>{uiText(locale, 'Решения с ручной процедурой', 'Decisions requiring manual review')}</h2>
      <p>
        {uiText(
          locale,
          'Ручное исполнение доступно только когда его прямо требует закреплённый устав. Откройте решение, проверьте условия и укажите причину.',
          'Manual execution is available only when the pinned charter explicitly requires it. Open the decision, review its terms and enter a reason.',
        )}
      </p>
      {query.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Ожидающих решений нет.', 'No pending decisions.')}</p>
      )}
      <ul>
        {query.data?.items.map((item) => (
          <li key={item.id}>
            <MonetaryCompany id={item.companyId} /> ·{' '}
            <a href={`/app/company-decisions/${item.id}`}>
              {uiText(locale, 'Проверить корпоративное решение', 'Review corporate decision')}
            </a>{' '}
            ·{' '}
            <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(locale)}</time>
          </li>
        ))}
      </ul>
      {query.data !== undefined && (
        <MonetaryPagination page={query.data.page} hasMore={query.data.hasMore} onPage={setPage} />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { AdminCompanyManualQueue };
