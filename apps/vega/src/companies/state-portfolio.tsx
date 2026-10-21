import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStateSharePortfolio } from '@helicraft/alhena';
import type { StateDetail, LegalOwner } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { economicAuthority } from '../taxation/model';
import { MonetaryPagination } from '../monetary/pagination';
import { ShareTransferComposer } from './share-transfer-composer';

function StateCompanyPortfolio({
  state,
  actorId,
}: Readonly<{ state: StateDetail; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const owner = useMemo((): LegalOwner => ({ type: 'STATE', id: state.id }), [state.id]);
  const query = useQuery({
    queryKey: ['state-company', state.id, 'portfolio', actorId, page],
    queryFn: async () => {
      const result = await getStateSharePortfolio({
        client: browserClient(),
        path: { id: state.id },
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
      <h2>{uiText(locale, 'Государственные доли в компаниях', 'State-owned company shares')}</h2>
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Долей пока нет.', 'No holdings yet.')}</p>
      )}
      {query.data?.items.map((position) => (
        <article key={position.issuerId}>
          <h3>
            <a href={`/companies/${position.issuerId}`}>{displayText(position.name, locale)}</a>
          </h3>
          <p>
            {position.shares} / {position.issuedShares}
          </p>
          {economicAuthority(state, actorId, 'TRANSFER_COMPANY_SHARES') && (
            <details>
              <summary>
                {uiText(
                  locale,
                  'Предложить передачу государственной доли',
                  'Propose state share disposition',
                )}
              </summary>
              <ShareTransferComposer position={position} owner={owner} onSaved={refresh} />
            </details>
          )}
        </article>
      ))}
      {query.data !== undefined && (
        <MonetaryPagination page={query.data.page} hasMore={query.data.hasMore} onPage={setPage} />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { StateCompanyPortfolio };
