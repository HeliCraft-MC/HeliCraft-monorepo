import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type { FxOfferList } from '@helicraft/alhena';
import { PageContainer, FieldHelp } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { OfferSummary } from './offer-summary';
import styles from '../companies/companies.module.scss';

import { FxPagination } from './pagination';
import { FxCatalogueFilters } from './catalogue-filters';
import type { FxSearch } from './catalogue-search';

const EMPTY_CURRENCIES: NonNullable<FxOfferList['currencies']> = [];
function PublicFxOffers({
  offers,
  search,
}: Readonly<{ offers: FxOfferList | null; search: FxSearch }>): ReactElement {
  const { locale } = useTranslation();
  const filters = useMemo(
    () => ({
      search: search.search,
      receiveCode: search.receiveCode,
      provideCode: search.provideCode,
    }),
    [search.search, search.receiveCode, search.provideCode],
  );
  return (
    <main id="main-content">
      <PageContainer>
        <section className={styles.page}>
          <h1>{uiText(locale, 'Обмен валют', 'Currency exchange')}</h1>
          <FieldHelp
            label={uiText(locale, 'Обеспеченное предложение', 'Reserved offer')}
            content={uiText(
              locale,
              'Банк заранее резервирует предлагаемую валюту на официальном счёте. Этот резерв нельзя потратить другими переводами. После истечения срока или отмены неиспользованный остаток снова доступен банку.',
              'The bank reserves the offered currency in its official account. Other transfers cannot spend this reserve. Expiry or cancellation releases its unused amount to the bank.',
            )}
          />
          <FxCatalogueFilters search={search} currencies={offers?.currencies ?? EMPTY_CURRENCIES} />
          {offers === null && (
            <p>
              {uiText(
                locale,
                'Предложения временно недоступны.',
                'Exchange offers are temporarily unavailable.',
              )}
            </p>
          )}
          {offers?.items.length === 0 && (
            <p>
              {uiText(
                locale,
                'Доступных предложений пока нет.',
                'There are no available offers yet.',
              )}
            </p>
          )}
          <div className={styles.grid}>
            {offers?.items.map((offer) => (
              <section key={offer.id}>
                <OfferSummary offer={offer} />
                <a href={`/exchange/${offer.id}?lang=${locale}`}>
                  {uiText(locale, 'Открыть предложение', 'View offer')}
                </a>
              </section>
            ))}
          </div>
          {offers !== null && (
            <FxPagination
              path="/exchange"
              search={filters}
              page={offers.page}
              hasMore={offers.hasMore}
            />
          )}
        </section>
      </PageContainer>
    </main>
  );
}
export { PublicFxOffers };
