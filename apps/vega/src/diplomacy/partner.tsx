import formStyles from './form.module.scss';
import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, listStates } from '@helicraft/alhena';
import { Alert, FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function TreatyPartner({
  stateId,
  value,
  onChange,
}: Readonly<{ stateId: string; value: string; onChange: (value: string) => void }>): ReactElement {
  const { locale } = useTranslation();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['treaty-partner', search, locale],
    queryFn: async () => {
      const result = await listStates({
        client: createClient({ credentials: 'omit' }),
        query: { search, pageSize: 20, locale },
        throwOnError: true,
      });
      return result.data.items;
    },
  });
  const changeSearch = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.currentTarget.value);
  }, []);
  const select = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onChange(event.currentTarget.value);
    },
    [onChange],
  );
  return (
    <fieldset className={formStyles.step}>
      <legend>{uiText(locale, '1. Государство-партнёр', '1. Partner state')}</legend>
      <FormField
        label={uiText(locale, 'Найти государство', 'Find a state')}
        htmlFor="treaty-search"
      >
        <TextField id="treaty-search" value={search} onChange={changeSearch} />
      </FormField>
      {query.isPending && <output>{uiText(locale, 'Поиск…', 'Searching…')}</output>}
      {query.error !== null && (
        <Alert tone="danger">
          {uiText(locale, 'Не удалось загрузить государства.', 'Could not load states.')}
        </Alert>
      )}
      <FormField label={uiText(locale, 'Партнёр', 'Partner')} htmlFor="treaty-partner">
        <Select id="treaty-partner" value={value} onChange={select} required>
          <option value="">{uiText(locale, 'Выберите государство', 'Choose a state')}</option>
          {query.data
            ?.filter((state) => state.id !== stateId)
            .map((state) => (
              <option key={state.id} value={state.id}>
                {displayText(state.name, locale)}
              </option>
            ))}
        </Select>
      </FormField>
    </fieldset>
  );
}
export { TreatyPartner };
