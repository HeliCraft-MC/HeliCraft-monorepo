import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listStateCompanyBranches } from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { StateCompanyBranchCard } from './state-branch-card';

function StateCompanyBranches({
  state,
  actorId,
  onSaved,
}: Readonly<{ state: StateDetail; actorId: string; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['state-company', state.id, 'branches', actorId, page],
    queryFn: async () => {
      const result = await listStateCompanyBranches({
        client: browserClient(),
        path: { id: state.id },
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section>
      <h2>{uiText(locale, 'Филиалы в государстве', 'Branches in this state')}</h2>
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Филиалов пока нет.', 'No branches yet.')}</p>
      )}
      {query.data?.items.map((branch) => (
        <StateCompanyBranchCard
          key={branch.id}
          branch={branch}
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
export { StateCompanyBranches };
