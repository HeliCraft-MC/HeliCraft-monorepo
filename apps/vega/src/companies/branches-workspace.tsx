import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCompanyBranches } from '@helicraft/alhena';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { CompanyBranchComposer } from './branch-composer';
import { CompanyBranchCard } from './branch-card';

function CompanyBranchesWorkspace({
  workspace,
  actorId,
}: Readonly<{ workspace: CompanyWorkspace; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['company-branches', workspace.id, actorId, page],
    queryFn: async () => {
      const result = await listCompanyBranches({
        client: browserClient(),
        path: { id: workspace.id },
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  return (
    <section>
      <h2>{uiText(locale, 'Филиалы компании', 'Company branches')}</h2>
      {workspace.availableActions.includes('REGISTER_BRANCH') && (
        <CompanyBranchComposer workspace={workspace} onSaved={refresh} />
      )}
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Филиалов пока нет.', 'No branches yet.')}</p>
      )}
      {query.data?.items.map((branch) => (
        <CompanyBranchCard
          key={branch.id}
          workspace={workspace}
          branch={branch}
          onSaved={refresh}
        />
      ))}
      {query.data !== undefined && (
        <MonetaryPagination page={query.data.page} hasMore={query.data.hasMore} onPage={setPage} />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { CompanyBranchesWorkspace };
