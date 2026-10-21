import type { ReactElement } from 'react';
import type { FxOffer, PublicFxOfferFills } from '@helicraft/alhena';
import { PageContainer, MoneyAmount } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { OfferSummary } from './offer-summary';
import { FxPagination } from './pagination';
import styles from '../companies/companies.module.scss';

function PublicFxOfferPage({
  offer,
  fills,
  missing = false,
}: Readonly<{
  offer: FxOffer | null;
  fills: PublicFxOfferFills | null;
  missing?: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const receiveCode =
    offer?.currencies.find((currency) => currency.id === offer.terms.receiveCurrencyId)?.code ?? '';
  const provideCode =
    offer?.currencies.find((currency) => currency.id === offer.terms.provideCurrencyId)?.code ?? '';
  return (
    <main id="main-content">
      <PageContainer>
        <section className={styles.page}>
          <a href="/exchange">{uiText(locale, 'Все предложения', 'All offers')}</a>
          <h1>{uiText(locale, 'Условия обмена', 'Exchange terms')}</h1>
          {offer === null ? (
            <p>
              {missing
                ? uiText(locale, 'Предложение не найдено.', 'Offer not found.')
                : uiText(
                    locale,
                    'Предложение временно недоступно.',
                    'Offer temporarily unavailable.',
                  )}
            </p>
          ) : (
            <>
              <OfferSummary offer={offer} />
              {offer.executable && (
                <a href={`/app/exchange/${offer.id}`}>
                  {uiText(locale, 'Рассчитать и обменять', 'Calculate and exchange')}
                </a>
              )}
              <section className={styles.card}>
                <h2>{uiText(locale, 'Исполнения предложения', 'Offer fills')}</h2>
                {fills === null && (
                  <p>
                    {uiText(
                      locale,
                      'История временно недоступна.',
                      'History temporarily unavailable.',
                    )}
                  </p>
                )}
                {fills?.items.length === 0 && (
                  <p>
                    {uiText(
                      locale,
                      'Предложение ещё не исполнялось.',
                      'This offer has no fills yet.',
                    )}
                  </p>
                )}
                <ol>
                  {fills?.items.map((fill) => (
                    <li key={fill.id}>
                      <time dateTime={fill.createdAt}>
                        {new Date(fill.createdAt).toLocaleString(locale, { timeZone: 'UTC' })} UTC
                      </time>{' '}
                      · {fill.lots} {uiText(locale, 'лотов', 'lots')}:{' '}
                      <MoneyAmount minor={fill.receiveMinor} code={receiveCode} locale={locale} /> →{' '}
                      <MoneyAmount minor={fill.provideMinor} code={provideCode} locale={locale} />
                    </li>
                  ))}
                </ol>
                {fills !== null && (
                  <FxPagination
                    path={`/exchange/${offer.id}`}
                    page={fills.page}
                    hasMore={fills.hasMore}
                  />
                )}
              </section>
            </>
          )}
        </section>
      </PageContainer>
    </main>
  );
}
export { PublicFxOfferPage };
