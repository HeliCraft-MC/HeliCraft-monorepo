import type { ReactElement } from 'react';
import type { CompanyCatalogue } from '@helicraft/alhena';
import { Button, FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, label, uiText } from '../states/text';
import type { CatalogueSearch } from './catalogue-search';
import styles from './companies.module.scss';

function CatalogueFilters({
  search,
  jurisdictions,
}: Readonly<{
  search: CatalogueSearch;
  jurisdictions: CompanyCatalogue['jurisdictions'];
}>): ReactElement {
  const { locale } = useTranslation();
  return (
    <form action="/companies" method="get" className={styles.filters} key={JSON.stringify(search)}>
      <input type="hidden" name="lang" value={locale} />
      <FormField label={uiText(locale, 'Поиск', 'Search')} htmlFor="company-search">
        <TextField
          id="company-search"
          name="search"
          type="search"
          maxLength={100}
          defaultValue={search.search}
          placeholder={uiText(locale, 'Название или описание', 'Name or description')}
        />
      </FormField>
      <FormField
        label={uiText(locale, 'Государство регистрации', 'Registration jurisdiction')}
        htmlFor="company-state"
      >
        <Select id="company-state" name="stateId" defaultValue={search.stateId}>
          <option value="">{uiText(locale, 'Все государства', 'All states')}</option>
          {jurisdictions.map((state) => (
            <option key={state.id} value={state.id}>
              {displayText(state.name, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={uiText(locale, 'Статус', 'Status')} htmlFor="company-status">
        <Select id="company-status" name="status" defaultValue={search.status}>
          <option value="ALL">{uiText(locale, 'Все опубликованные', 'All published')}</option>
          {(['ACTIVE', 'SUSPENDED', 'CLOSED'] as const).map((status) => (
            <option key={status} value={status}>
              {label(status, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={uiText(locale, 'Сортировка', 'Sort')} htmlFor="company-sort">
        <Select id="company-sort" name="sort" defaultValue={search.sort}>
          <option value="NEWEST">{uiText(locale, 'Сначала новые', 'Newest first')}</option>
          <option value="OLDEST">{uiText(locale, 'Сначала старые', 'Oldest first')}</option>
          <option value="NAME">{uiText(locale, 'По названию', 'By name')}</option>
        </Select>
      </FormField>
      <div className={styles.actions}>
        <Button type="submit">{uiText(locale, 'Найти компании', 'Find companies')}</Button>
        <a href={`/companies?lang=${locale}`}>{uiText(locale, 'Сбросить', 'Reset')}</a>
      </div>
    </form>
  );
}
export { CatalogueFilters };
