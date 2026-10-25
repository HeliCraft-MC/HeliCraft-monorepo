import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listStateCompanyRegistrationApplications } from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { StateCompanyApplicationCard } from './state-application-card';

function StateCompanyApplications({
  state,
  actorId,
  onSaved,
}: Readonly<{ state: StateDetail; actorId: string; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['state-company', state.id, 'applications', actorId, page],
    queryFn: async () => {
      const result = await listStateCompanyRegistrationApplications({
        client: browserClient(),
        path: { id: state.id },
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section id="company-applications">
      <h2>{uiText(locale, 'Регистрационные заявки', 'Registration applications')}</h2>
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Заявок пока нет.', 'No applications yet.')}</p>
      )}
      {query.data?.items.map((application) => (
        <StateCompanyApplicationCard
          key={application.id}
          application={application}
          state={state}
          actorId={actorId}
          onSaved={onSaved}
        />
      ))}
      {query.data !== undefined && (
        <MonetaryPagination page={query.data.page} hasMore={query.data.hasMore} onPage={setPage} />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { StateCompanyApplications };
