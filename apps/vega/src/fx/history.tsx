// oxlint-disable import/max-dependencies -- Private exchange history composes current account identity, immutable receipts and standard loading/error/pagination controls.
import { useState } from 'react';
import type { ReactElement } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getFxExchangeHistory } from '@helicraft/alhena';
import { Alert, LoadingState } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { FxReceipt } from './receipt';
import styles from '../monetary/monetary.module.scss';

const account = getRouteApi('/app');
function FxHistoryPage(): ReactElement {
  const { locale } = useTranslation();
  const { principal } = account.useRouteContext();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['fx-history', principal.id, page],
    queryFn: async () => {
      const result = await getFxExchangeHistory({
        client: browserClient(),
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section className={styles.panel}>
      <h1>{uiText(locale, 'Мои обмены валют', 'My currency exchanges')}</h1>
      <a href="/exchange">{uiText(locale, 'Доступные предложения', 'Available offers')}</a>
      {query.isPending && (
        <LoadingState label={uiText(locale, 'Загрузка истории', 'Loading exchange history')} />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Обменов пока нет.', 'No exchanges yet.')}</p>
      )}
      {query.data?.items.map((receipt) => (
        <FxReceipt key={receipt.id} receipt={receipt} />
      ))}
      {query.data !== undefined && (
        <MonetaryPagination page={query.data.page} hasMore={query.data.hasMore} onPage={setPage} />
      )}
    </section>
  );
}
export { FxHistoryPage };
