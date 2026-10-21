import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyBranch } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { companyStatusLabel } from './labels';

function CompanyBranchDetail({ id }: Readonly<{ id: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['company-branch', id, page],
    queryFn: async () => {
      const result = await getCompanyBranch({
        client: browserClient(),
        path: { id },
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section>
      {query.data !== undefined && (
        <>
          <p>
            {displayText(query.data.application.name, locale)} ·{' '}
            {companyStatusLabel(query.data.application.status, locale)}
          </p>
          {query.data.application.reviewReason !== null && (
            <p>{query.data.application.reviewReason}</p>
          )}
          <h4>{uiText(locale, 'История присутствия', 'Presence history')}</h4>
          <ol>
            {query.data.history.items.map((entry) => (
              <li key={entry.id}>
                {companyStatusLabel(entry.toStatus, locale)} ·{' '}
                <time dateTime={entry.createdAt}>
                  {new Date(entry.createdAt).toLocaleString(locale)}
                </time>
                {entry.reason !== null && <p>{entry.reason}</p>}
              </li>
            ))}
          </ol>
          <MonetaryPagination
            page={query.data.history.page}
            hasMore={query.data.history.hasMore}
            onPage={setPage}
          />
        </>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { CompanyBranchDetail };
