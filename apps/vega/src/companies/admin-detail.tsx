import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCompanyWorkspace } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyLifecycleHistory } from './lifecycle-history';
import { AdminCompanyStatus } from './admin-status';

function AdminCompanyDetail({
  id,
  actorId,
}: Readonly<{ id: string; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const queries = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-company', id, actorId],
    queryFn: async () => {
      const result = await getCompanyWorkspace({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
    void queries.invalidateQueries({ queryKey: ['company-lifecycle', id] });
  }, [refetch, queries, id]);
  return (
    <section>
      {query.isPending && <p>{uiText(locale, 'Загрузка компании…', 'Loading company…')}</p>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data !== undefined && query.error === null && (
        <>
          <h2>{displayText(query.data.content.name, locale)}</h2>
          <a href={`/app/companies/${id}`}>
            {uiText(
              locale,
              'Открыть корпоративную историю и решения',
              'Open corporate history and decisions',
            )}
          </a>
          <AdminCompanyStatus key={query.data.status} workspace={query.data} onSaved={refresh} />
          <CompanyLifecycleHistory companyId={id} actorId={actorId} />
        </>
      )}
    </section>
  );
}
export { AdminCompanyDetail };
