import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getFxOffer } from '@helicraft/alhena';
import { Alert, LoadingState } from '@helicraft/atria';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { OfferSummary } from './offer-summary';
import { ExchangeForm } from './exchange-form';
import styles from '../monetary/monetary.module.scss';

function FxExchangePage({ id }: Readonly<{ id: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['fx-offer', id],
    queryFn: async () => {
      const result = await getFxOffer({
        client: createClient({ credentials: 'omit' }),
        path: { id },
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
      <h1>{uiText(locale, 'Обмен валют', 'Currency exchange')}</h1>
      <a href="/exchange">{uiText(locale, 'Все предложения', 'All offers')}</a>
      {query.isPending && (
        <LoadingState label={uiText(locale, 'Загрузка предложения', 'Loading offer')} />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data !== undefined && (
        <>
          <OfferSummary offer={query.data} />
          <ExchangeForm offer={query.data} onSaved={refresh} />
        </>
      )}
      <a href="/app/exchange">{uiText(locale, 'Моя история обменов', 'My exchange history')}</a>
    </section>
  );
}
export { FxExchangePage };
