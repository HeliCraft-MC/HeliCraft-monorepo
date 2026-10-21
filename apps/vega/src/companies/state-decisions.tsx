import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listStateCompanyDecisions } from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { DirectiveCard } from '../monetary/directive-card';
import { MonetaryPagination } from '../monetary/pagination';

function StateCompanyDecisions({
  state,
  actorId,
  onSaved,
}: Readonly<{ state: StateDetail; actorId: string; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['state-company', state.id, 'decisions', actorId, page],
    queryFn: async () => {
      const result = await listStateCompanyDecisions({
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
      <h2>
        {uiText(locale, 'Государственные корпоративные решения', 'State corporate decisions')}
      </h2>
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Решений пока нет.', 'No decisions yet.')}</p>
      )}
      {query.data?.items.map((directive) => (
        <DirectiveCard
          key={directive.id}
          directive={directive}
          state={state}
          actorId={actorId}
          code=""
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
export { StateCompanyDecisions };
