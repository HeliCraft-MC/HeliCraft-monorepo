import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPersonalSharePortfolio } from '@helicraft/alhena';
import type { LegalOwner } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { ShareTransferComposer } from './share-transfer-composer';

function PersonalCompanyShares({ actorId }: Readonly<{ actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const owner = useMemo((): LegalOwner => ({ type: 'PLAYER', id: actorId }), [actorId]);
  const query = useQuery({
    queryKey: ['personal-company-shares', actorId, page],
    queryFn: async () => {
      const result = await getPersonalSharePortfolio({
        client: browserClient(),
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
      <h1>{uiText(locale, 'Мои доли в компаниях', 'My company shares')}</h1>
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Долей пока нет.', 'No shares yet.')}</p>
      )}
      {query.data?.items.map((position) => (
        <article key={position.issuerId}>
          <h2>
            <a href={`/companies/${position.issuerId}`}>{displayText(position.name, locale)}</a>
          </h2>
          <p>
            {position.shares} / {position.issuedShares}
          </p>
          <a href={`/app/companies/${position.issuerId}`}>
            {uiText(locale, 'Рабочее пространство компании', 'Company workspace')}
          </a>
          <details>
            <summary>{uiText(locale, 'Передать акции', 'Transfer shares')}</summary>
            <ShareTransferComposer position={position} owner={owner} onSaved={refresh} />
          </details>
        </article>
      ))}
      {query.data !== undefined && (
        <MonetaryPagination page={query.data.page} hasMore={query.data.hasMore} onPage={setPage} />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { PersonalCompanyShares };
