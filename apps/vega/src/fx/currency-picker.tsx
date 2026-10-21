import { useCallback, useId, useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createClient, listPublicCurrencies } from '@helicraft/alhena';
import type { NationalCurrency } from '@helicraft/alhena';
import { Alert, Button, FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function CurrencyPicker({
  label,
  name,
  value,
  onChange,
}: Readonly<{
  label: string;
  name: string;
  value: NationalCurrency | null;
  onChange: (currency: NationalCurrency | null) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const query = useInfiniteQuery({
    queryKey: ['fx-public-currencies'],
    initialPageParam: '',
    queryFn: async ({ pageParam }) => {
      const result = await listPublicCurrencies({
        client: createClient({ credentials: 'omit' }),
        query: { after: pageParam === '' ? undefined : pageParam },
        throwOnError: true,
      });
      return result.data;
    },
    getNextPageParam: (page) => page.nextCode ?? undefined,
  });
  const currencies = useMemo(
    () => query.data?.pages.flatMap((page) => page.items.map((item) => item.currency)) ?? [],
    [query.data],
  );
  const select = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onChange(currencies.find((currency) => currency.id === event.currentTarget.value) ?? null);
    },
    [currencies, onChange],
  );
  const more = useCallback((): void => {
    void query.fetchNextPage();
  }, [query]);
  return (
    <section>
      <FormField label={label} htmlFor={id}>
        <Select id={id} name={name} value={value?.id ?? ''} onChange={select} required>
          <option value="">{uiText(locale, 'Выберите валюту', 'Select a currency')}</option>
          {currencies
            .filter((currency) => currency.status === 'ACTIVE')
            .map((currency) => (
              <option key={currency.id} value={currency.id}>
                {displayText(currency.name, locale)} · {currency.code}
              </option>
            ))}
        </Select>
      </FormField>
      {query.isPending && (
        <output>{uiText(locale, 'Загрузка валют…', 'Loading currencies…')}</output>
      )}
      {query.error !== null && (
        <Alert tone="danger">
          {uiText(locale, 'Не удалось загрузить валюты.', 'Could not load currencies.')}
        </Alert>
      )}
      {query.hasNextPage && (
        <Button onClick={more} disabled={query.isFetchingNextPage}>
          {uiText(locale, 'Загрузить ещё валюты', 'Load more currencies')}
        </Button>
      )}
    </section>
  );
}
export { CurrencyPicker };
