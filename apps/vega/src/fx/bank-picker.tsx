import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getFxBank, listStates } from '@helicraft/alhena';
import type { FxOffer } from '@helicraft/alhena';
import { Alert, Button, FormField, Select, TextField } from '@helicraft/atria';
import { StateName } from '../state-name';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function FxBankPicker({
  excludeStateId,
  value,
  onChange,
}: Readonly<{
  excludeStateId: string;
  value: FxOffer['bank'] | null;
  onChange: (bank: FxOffer['bank'] | null) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const states = useQuery({
    queryKey: ['fx-state-search', search, locale],
    queryFn: async () => {
      const result = await listStates({
        client: createClient({ credentials: 'omit' }),
        query: { search, locale, pageSize: 20 },
        throwOnError: true,
      });
      return result.data.items;
    },
  });
  const bank = useQuery({
    queryKey: ['fx-bank', selected],
    enabled: selected !== '',
    retry: false,
    queryFn: async () => {
      const result = await getFxBank({
        client: createClient({ credentials: 'omit' }),
        path: { id: selected },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const changeSearch = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.currentTarget.value);
  }, []);
  const changeState = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      setSelected(event.currentTarget.value);
      onChange(null);
    },
    [onChange],
  );
  const choose = useCallback((): void => {
    if (bank.data !== undefined && bank.data.stateId === selected && bank.data.available) {
      onChange(bank.data);
    }
  }, [bank.data, selected, onChange]);
  return (
    <fieldset>
      <legend>{uiText(locale, 'Другой Центральный банк', 'Counterparty central bank')}</legend>
      <FormField
        label={uiText(locale, 'Найти государство', 'Find a state')}
        htmlFor={`${id}-search`}
      >
        <TextField id={`${id}-search`} value={search} onChange={changeSearch} />
      </FormField>
      <FormField
        label={uiText(locale, 'Государство банка', 'Bank jurisdiction')}
        htmlFor={`${id}-state`}
      >
        <Select id={`${id}-state`} value={selected} onChange={changeState}>
          <option value="">{uiText(locale, 'Выберите государство', 'Choose a state')}</option>
          {states.data
            ?.filter((state) => state.id !== excludeStateId)
            .map((state) => (
              <option key={state.id} value={state.id}>
                {displayText(state.name, locale)}
              </option>
            ))}
        </Select>
      </FormField>
      {(states.isPending || (selected !== '' && bank.isPending)) && (
        <output>{uiText(locale, 'Загрузка…', 'Loading…')}</output>
      )}
      {(states.error !== null || bank.error !== null) && (
        <Alert tone="danger">
          {uiText(
            locale,
            'Не удалось найти действующий опубликованный банк.',
            'Could not find an active published bank.',
          )}
        </Alert>
      )}
      {bank.data !== undefined && (
        <>
          <p>
            {displayText(bank.data.name, locale)} ·{' '}
            <StateName id={bank.data.stateId} name={displayText(bank.data.stateName, locale)} />
          </p>
          <Button onClick={choose} disabled={!bank.data.available || value?.id === bank.data.id}>
            {uiText(locale, 'Выбрать этот банк', 'Use this bank')}
          </Button>
        </>
      )}
      {value !== null && (
        <p>
          {uiText(locale, 'Выбран', 'Selected')}: {displayText(value.name, locale)} ·{' '}
          <StateName id={value.stateId} name={displayText(value.stateName, locale)} />
        </p>
      )}
    </fieldset>
  );
}
export { FxBankPicker };
