import type { ReactElement } from 'react';
import type { FxOfferList } from '@helicraft/alhena';
import { Button, FormField, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import type { FxSearch } from './catalogue-search';

import { FxCurrencyFilter } from './currency-filter';

function FxCatalogueFilters({
  search,
  currencies,
}: Readonly<{
  search: FxSearch;
  currencies: NonNullable<FxOfferList['currencies']>;
}>): ReactElement {
  const { locale } = useTranslation();
  return (
    <form action="/exchange" method="get">
      <input type="hidden" name="lang" value={locale} />
      <FormField
        htmlFor="fx-search"
        label={uiText(locale, 'Банк, государство или валюта', 'Bank, state or currency')}
      >
        <TextField
          id="fx-search"
          name="search"
          type="search"
          defaultValue={search.search}
          maxLength={100}
        />
      </FormField>
      <FxCurrencyFilter
        name="receiveCode"
        value={search.receiveCode}
        currencies={currencies}
        label={uiText(locale, 'Вы отдаёте', 'You pay')}
      />
      <FxCurrencyFilter
        name="provideCode"
        value={search.provideCode}
        currencies={currencies}
        label={uiText(locale, 'Вы получаете', 'You receive')}
      />
      <Button type="submit">{uiText(locale, 'Найти предложения', 'Find offers')}</Button>{' '}
      <a href={`/exchange?lang=${locale}`}>{uiText(locale, 'Сбросить фильтры', 'Reset filters')}</a>
    </form>
  );
}
export { FxCatalogueFilters };
