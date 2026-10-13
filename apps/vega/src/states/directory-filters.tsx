import type { ReactElement } from 'react';
import { Button, FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { label, uiText } from './text';
import type { DirectorySearch } from './directory-search';
import styles from './states.module.scss';

function DirectoryFilters({ search }: Readonly<{ search: DirectorySearch }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <form action="/states" method="get" className={styles.filters} key={JSON.stringify(search)}>
      <input type="hidden" name="lang" value={locale} />
      <FormField label={uiText(locale, 'Поиск', 'Search')} htmlFor="state-search">
        <TextField
          id="state-search"
          name="search"
          type="search"
          maxLength={200}
          defaultValue={search.search}
          placeholder={uiText(locale, 'Название, описание или адрес', 'Name, description or slug')}
        />
      </FormField>
      <FormField label={uiText(locale, 'Приём граждан', 'Citizen entry')} htmlFor="state-entry">
        <Select id="state-entry" name="entryMode" defaultValue={search.entryMode}>
          <option value="ALL">{uiText(locale, 'Любой способ', 'Any entry method')}</option>
          {(['OPEN', 'BY_APPLICATION', 'BY_INVITATION'] as const).map((mode) => (
            <option key={mode} value={mode}>
              {label(mode, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={uiText(locale, 'Конституция', 'Constitution')} htmlFor="state-constitution">
        <Select id="state-constitution" name="constitution" defaultValue={search.constitution}>
          <option value="ALL">{uiText(locale, 'Все государства', 'All states')}</option>
          <option value="YES">{uiText(locale, 'С документом', 'With a document')}</option>
          <option value="NO">{uiText(locale, 'Без документа', 'Without a document')}</option>
        </Select>
      </FormField>
      <FormField label={uiText(locale, 'Сортировка', 'Sort')} htmlFor="state-sort">
        <Select id="state-sort" name="sort" defaultValue={search.sort}>
          <option value="NEWEST">{uiText(locale, 'Сначала новые', 'Newest first')}</option>
          <option value="NAME">{uiText(locale, 'По названию', 'By name')}</option>
          <option value="POPULATION">
            {uiText(locale, 'По числу граждан', 'By citizen count')}
          </option>
        </Select>
      </FormField>
      <div className={styles.actions}>
        <Button type="submit">{uiText(locale, 'Найти государства', 'Find states')}</Button>
        <a href={`/states?lang=${locale}`}>{uiText(locale, 'Сбросить', 'Reset')}</a>
      </div>
    </form>
  );
}
export { DirectoryFilters };
