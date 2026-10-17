// oxlint-disable import/max-dependencies -- Wallet composition uses shared exact amounts, pagination, transfer confirmation and transaction history.
import { getRouteApi } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWallet } from '@helicraft/alhena';
import { Alert, MoneyAmount } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';
import { MonetaryPagination } from './pagination';
import { MonetaryHistory } from './history';
import { WalletTransfer } from './wallet-transfer';
import styles from './monetary.module.scss';

const accountRoute = getRouteApi('/app');
function WalletPage(): ReactElement {
  const { principal } = accountRoute.useRouteContext();
  const { text, locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['wallet', page],
    queryFn: async () => {
      const result = await getWallet({
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
    <section className={styles.panel}>
      <h1>{text('monetary.wallet')}</h1>
      <p>{text('monetary.privateHint')}</p>
      {query.isPending && <output>{text('monetary.loading')}</output>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data !== undefined && (
        <>
          {query.data.accounts.length === 0 && <p>{text('monetary.emptyWallet')}</p>}
          <div className={styles.grid}>
            {query.data.accounts.map((account) => {
              const currency = query.data.currencies.find((item) => item.id === account.currencyId);
              return (
                <article className={styles.card} key={account.id}>
                  <h2>{displayText(currency?.name ?? {}, locale)}</h2>
                  <div className={styles.amount}>
                    <MoneyAmount
                      minor={account.balanceMinor}
                      code={currency?.code ?? ''}
                      locale={locale}
                    />
                  </div>
                  <a href={`/currencies/${currency?.code ?? ''}`}>{text('monetary.public')}</a>
                </article>
              );
            })}
          </div>
          {query.data.accounts.length > 0 && (
            <WalletTransfer currencies={query.data.currencies} onSaved={refresh} />
          )}
          <MonetaryPagination
            page={query.data.page}
            hasMore={query.data.hasMore}
            onPage={setPage}
          />
          <MonetaryHistory
            ownActorId={principal.id}
            transactions={query.data.transactions}
            currencies={query.data.currencies}
          />
        </>
      )}
    </section>
  );
}
export { WalletPage };
