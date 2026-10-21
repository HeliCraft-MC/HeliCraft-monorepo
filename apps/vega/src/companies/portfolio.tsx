import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanySharePortfolio } from '@helicraft/alhena';
import type { CompanyWorkspace, LegalOwner } from '@helicraft/alhena';
import { Alert, FieldHelp } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { ShareTransferComposer } from './share-transfer-composer';

function CompanySharePortfolio({
  workspace,
  actorId,
}: Readonly<{ workspace: CompanyWorkspace; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const companyId = workspace.id;
  const owner = useMemo((): LegalOwner => ({ type: 'COMPANY', id: companyId }), [companyId]);
  const query = useQuery({
    queryKey: ['company-share-portfolio', companyId, actorId, page],
    queryFn: async () => {
      const result = await getCompanySharePortfolio({
        client: browserClient(),
        path: { id: companyId },
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
      <h2>{uiText(locale, 'Доли в других компаниях', 'Corporate share holdings')}</h2>
      <FieldHelp
        label={uiText(locale, 'Дочерняя компания', 'Subsidiary')}
        content={uiText(
          locale,
          'Контроль по капиталу означает владение более чем половиной акций. Дочерняя компания сохраняет собственный устав, имущество и полномочия. Доступ к её деньгам не возникает автоматически.',
          'Capital control means owning more than half of the issued shares. A subsidiary retains its own charter, assets and authority. Financial access is not automatic.',
        )}
      />
      {query.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Долей пока нет.', 'No holdings yet.')}</p>
      )}
      <ul>
        {query.data?.items.map((position) => (
          <li key={position.issuerId}>
            <a href={`/companies/${position.issuerId}`}>{displayText(position.name, locale)}</a>:{' '}
            {position.shares} / {position.issuedShares}
            {position.controls && (
              <strong> · {uiText(locale, 'Дочерняя компания', 'Subsidiary')}</strong>
            )}
            {workspace.availableActions.includes('TRANSFER_OWNED_SHARES') && (
              <details>
                <summary>
                  {uiText(
                    locale,
                    'Распорядиться принадлежащими акциями',
                    'Dispose of owned shares',
                  )}
                </summary>
                <ShareTransferComposer position={position} owner={owner} onSaved={refresh} />
              </details>
            )}
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
export { CompanySharePortfolio };
