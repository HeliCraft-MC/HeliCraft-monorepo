// oxlint-disable import/max-dependencies -- State FX composition combines actual financial balances, immutable bilateral trades, finite offers and existing Governance approval controls.
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStateFx, getStateMonetary } from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { Alert, LoadingState } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { economicAuthority } from '../taxation/model';
import { DirectiveCard } from '../monetary/directive-card';
import { MonetaryOverview } from '../monetary/overview';
import { MonetaryPagination } from '../monetary/pagination';
import { OfferComposer } from './offer-composer';
import { InterbankComposer } from './interbank-composer';
import { InterbankTradeCard } from './trade-card';
import { StateFxOffer } from './state-offer';
import styles from '../monetary/monetary.module.scss';

function StateFxWorkspace({
  state,
  actorId,
}: Readonly<{ state: StateDetail; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['state-fx', state.id, actorId, page],
    queryFn: async () => {
      const [fx, money] = await Promise.all([
        getStateFx({
          client: browserClient(),
          path: { id: state.id },
          query: { page },
          throwOnError: true,
        }),
        getStateMonetary({
          client: browserClient(),
          path: { stateId: state.id },
          throwOnError: true,
        }),
      ]);
      return { fx: fx.data, monetary: money.data };
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  if (query.isPending) {
    return (
      <LoadingState
        label={uiText(locale, 'Загрузка валютных операций', 'Loading currency operations')}
      />
    );
  }
  if (!query.data) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  const { fx, monetary } = query.data;
  return (
    <section className={styles.panel}>
      <h1>
        {uiText(locale, 'Валютные операции Центрального банка', 'Central bank currency exchange')}
      </h1>
      <MonetaryOverview data={monetary} section="bank-finances" />
      {economicAuthority(state, actorId, 'PUBLISH_FX_OFFER') && (
        <OfferComposer state={state} monetary={monetary} onSaved={refresh} />
      )}
      {economicAuthority(state, actorId, 'APPROVE_INTERBANK_EXCHANGE') && (
        <InterbankComposer state={state} monetary={monetary} onSaved={refresh} />
      )}
      <h2>{uiText(locale, 'Обменные предложения банка', 'Our bank offers')}</h2>
      {fx.offers.length === 0 && <p>{uiText(locale, 'Предложений пока нет.', 'No offers yet.')}</p>}
      {fx.offers.map((offer) => (
        <StateFxOffer
          key={offer.id}
          offer={offer}
          state={state}
          actorId={actorId}
          onSaved={refresh}
        />
      ))}
      <h2>{uiText(locale, 'Межбанковские сделки', 'Interbank trades')}</h2>
      {fx.trades.length === 0 && (
        <p>{uiText(locale, 'Сделок пока нет.', 'No interbank trades yet.')}</p>
      )}
      {fx.trades.map((trade) => (
        <InterbankTradeCard
          key={trade.id}
          trade={trade}
          state={state}
          actorId={actorId}
          onSaved={refresh}
        />
      ))}
      <h2>{uiText(locale, 'Решения и одобрения', 'Decisions and approvals')}</h2>
      {fx.decisions.length === 0 && (
        <p>{uiText(locale, 'Валютных решений пока нет.', 'No currency exchange decisions yet.')}</p>
      )}
      {fx.decisions.map((decision) => (
        <DirectiveCard
          key={decision.id}
          directive={decision}
          state={state}
          actorId={actorId}
          code=""
          onSaved={refresh}
        />
      ))}
      <MonetaryPagination page={fx.page} hasMore={fx.hasMore} onPage={setPage} />
    </section>
  );
}
export { StateFxWorkspace };
