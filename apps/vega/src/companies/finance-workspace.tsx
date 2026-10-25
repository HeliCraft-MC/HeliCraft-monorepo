import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyFinances } from '@helicraft/alhena';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { Alert, FieldHelp, MoneyAmount } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { MonetaryHistory } from '../monetary/history';
import { MonetaryPagination } from '../monetary/pagination';
import { CompanyPaymentComposer } from './payment-composer';

function CompanyFinanceWorkspace({
  workspace,
  actorId,
}: Readonly<{ workspace: CompanyWorkspace; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['company-finances', workspace.id, actorId, page],
    queryFn: async () => {
      const result = await getCompanyFinances({
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
      <h2>{uiText(locale, 'Финансы компании', 'Company finances')}</h2>
      <FieldHelp
        showLabel
        label={uiText(locale, 'Финансовые полномочия', 'Financial authority')}
        content={uiText(
          locale,
          'Списание разрешает действующая финансовая процедура устава, а не владение акциями само по себе. Порог проверяется по полному списанию с налогами. Одобрения и голоса закреплены за точными условиями платежа.',
          'The current charter financial procedure authorizes spending; share ownership alone does not. Bands use the full debit including tax. Approvals and votes bind the exact payment terms.',
        )}
      />
      {query.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data !== undefined && query.error === null && (
        <>
          {query.data.accounts.length === 0 && (
            <p>
              {uiText(
                locale,
                'Средств пока нет. Счёт появляется при реальном поступлении; имущество собственников и компании учитывается отдельно.',
                'No funds yet. Accounts appear on actual receipt; owners and the company hold separate assets.',
              )}
            </p>
          )}
          <ul>
            {query.data.accounts.map((account) => (
              <li key={account.id}>
                {displayText(
                  query.data?.currencies.find((currency) => currency.id === account.currencyId)
                    ?.name ?? {},
                  locale,
                )}{' '}
                ·{' '}
                <MoneyAmount
                  minor={account.balanceMinor}
                  code={
                    query.data?.currencies.find((currency) => currency.id === account.currencyId)
                      ?.code ?? ''
                  }
                  locale={locale}
                />
              </li>
            ))}
          </ul>
          {workspace.availableActions.includes('TRANSFER_FUNDS') && (
            <CompanyPaymentComposer workspace={workspace} wallet={query.data} onSaved={refresh} />
          )}
          <MonetaryHistory
            transactions={query.data.transactions}
            currencies={query.data.currencies}
            ownActorId={actorId}
            showOperationDetails
          />
          <MonetaryPagination
            page={query.data.page}
            hasMore={query.data.hasMore}
            onPage={setPage}
          />
        </>
      )}
    </section>
  );
}
export { CompanyFinanceWorkspace };
