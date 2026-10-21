import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, listStates } from '@helicraft/alhena';
import { Alert, Button, FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyStateIdentity } from './state-identity';

const PAGE_SIZE = 20;
function CompanyJurisdictionPicker({
  value,
  onChange,
  label,
}: Readonly<{
  value: string | null;
  onChange: (id: string) => void;
  label: string;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['company-jurisdictions', search, page, locale],
    queryFn: async () => {
      const result = await listStates({
        client: createClient({ credentials: 'omit' }),
        query: { search, page, pageSize: PAGE_SIZE, locale },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const changeSearch = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.currentTarget.value);
    setPage(1);
  }, []);
  const select = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      if (event.currentTarget.value !== '') {
        onChange(event.currentTarget.value);
      }
    },
    [onChange],
  );
  const previous = useCallback((): void => {
    setPage((current) => Math.max(1, current - 1));
  }, []);
  const next = useCallback((): void => {
    setPage((current) => current + 1);
  }, []);
  return (
    <section>
      <FormField
        label={uiText(locale, 'Поиск государства', 'Search jurisdictions')}
        htmlFor={`${id}-search`}
      >
        <TextField id={`${id}-search`} value={search} onChange={changeSearch} />
      </FormField>
      {value !== null && (
        <p>
          {uiText(locale, 'Выбрано', 'Selected')}: <CompanyStateIdentity id={value} />
        </p>
      )}
      <FormField label={label} htmlFor={`${id}-select`}>
        <Select
          id={`${id}-select`}
          value={
            query.data?.items.some((state) => state.id === value) === true ? (value ?? '') : ''
          }
          onChange={select}
        >
          <option value="">
            {uiText(locale, 'Выберите государство', 'Choose a jurisdiction')}
          </option>
          {query.data?.items.map((state) => (
            <option key={state.id} value={state.id}>
              {displayText(state.name, locale) || state.slug}
            </option>
          ))}
        </Select>
      </FormField>
      {query.isPending && <output>{uiText(locale, 'Загрузка…', 'Loading…')}</output>}
      {query.isError && (
        <Alert tone="danger">
          {uiText(locale, 'Не удалось загрузить государства.', 'Could not load jurisdictions.')}
        </Alert>
      )}
      <Button onClick={previous} disabled={page === 1}>
        {uiText(locale, 'Назад', 'Previous')}
      </Button>
      <Button
        onClick={next}
        disabled={query.data === undefined || page * PAGE_SIZE >= query.data.total}
      >
        {uiText(locale, 'Далее', 'Next')}
      </Button>
    </section>
  );
}
export { CompanyJurisdictionPicker };
