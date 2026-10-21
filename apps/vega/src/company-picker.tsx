import { useCallback, useEffect, useId, useState } from 'react';
import type { ChangeEvent, MouseEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, listPublishedCompanies } from '@helicraft/alhena';
import type { PublishedCompanyIdentity } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField } from '@helicraft/atria';
import { useTranslation } from './i18n';
import type { Locale } from './locales';
import { displayText, uiText } from './states/text';
import styles from './gallery.module.scss';

const LAST_OFFSET = -1;
const SEARCH_DELAY = 250;
const MIN_QUERY = 2;
const MAX_QUERY = 100;
function companyPickerLabel(locale: Locale, label?: string): string {
  return label ?? uiText(locale, 'Компания-получатель', 'Recipient company');
}
function CompanyPicker({
  value,
  onChange,
  disabled = false,
  label,
}: Readonly<{
  value: PublishedCompanyIdentity | null;
  onChange: (value: PublishedCompanyIdentity | null) => void;
  disabled?: boolean;
  label?: string;
}>): ReactElement {
  const { locale, text } = useTranslation();
  const id = useId();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [cursors, setCursors] = useState<string[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim());
      setCursors([]);
    }, SEARCH_DELAY);
    return (): void => {
      clearTimeout(timer);
    };
  }, [input]);
  const search = useQuery({
    queryKey: ['published-company-search', query, cursors],
    enabled: query.length >= MIN_QUERY && !disabled && value === null,
    retry: false,
    queryFn: async ({ signal }) => {
      const result = await listPublishedCompanies({
        client: createClient({ credentials: 'omit' }),
        query: { query, after: cursors.at(LAST_OFFSET) },
        signal,
        throwOnError: true,
      });
      return result.data;
    },
  });
  const change = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setInput(event.currentTarget.value);
  }, []);
  const choose = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const company = search.data?.items.find((item) => item.id === event.currentTarget.value);
      if (company) {
        onChange(company);
        setInput('');
        setQuery('');
        setCursors([]);
      }
    },
    [search.data, onChange],
  );
  const clear = useCallback((): void => {
    onChange(null);
  }, [onChange]);
  const next = useCallback((): void => {
    const after = search.data?.nextId;
    if (after !== undefined && after !== null) {
      setCursors((current) => [...current, after]);
    }
  }, [search.data]);
  const previous = useCallback((): void => {
    setCursors((current) => current.slice(0, LAST_OFFSET));
  }, []);
  return (
    <section className={styles.playerPicker}>
      <FormField
        label={companyPickerLabel(locale, label)}
        htmlFor={id}
        hint={uiText(
          locale,
          'Найдите действующую компанию по её опубликованному названию.',
          'Find an active company by its published name.',
        )}
      >
        <TextField
          id={id}
          type="search"
          value={input}
          onChange={change}
          disabled={disabled || value !== null}
          maxLength={MAX_QUERY}
          autoComplete="off"
        />
      </FormField>
      {value !== null && (
        <div className={styles.playerChips}>
          <span>
            {displayText(value.name, locale)} · {displayText(value.registrationStateName, locale)}
          </span>
          <Button
            tone="quiet"
            disabled={disabled}
            onClick={clear}
            aria-label={`${text('common.remove')}: ${displayText(value.name, locale)}`}
          >
            ×
          </Button>
        </div>
      )}
      {value === null && input.trim() === query && query.length >= MIN_QUERY && (
        <>
          {search.isFetching && <output>{text('common.loading')}</output>}
          {search.isError && (
            <Alert tone="danger">
              {uiText(
                locale,
                'Поиск компаний недоступен. Повторите попытку.',
                'Company search unavailable. Try again.',
              )}
            </Alert>
          )}
          {search.isSuccess && search.data.items.length === 0 && (
            <output>
              {uiText(locale, 'Действующие компании не найдены.', 'No active companies found.')}
            </output>
          )}
          <ul
            className={styles.playerResults}
            aria-label={uiText(locale, 'Найденные компании', 'Company results')}
          >
            {search.data?.items.map((company) => (
              <li key={company.id}>
                <Button tone="quiet" value={company.id} onClick={choose} disabled={disabled}>
                  <span>
                    {displayText(company.name, locale)} ·{' '}
                    {displayText(company.registrationStateName, locale)}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
          {cursors.length > 0 && (
            <Button tone="quiet" onClick={previous} disabled={search.isFetching || disabled}>
              {uiText(locale, 'Предыдущие', 'Previous')}
            </Button>
          )}
          {search.data?.nextId !== undefined && search.data.nextId !== null && (
            <Button tone="quiet" onClick={next} disabled={search.isFetching || disabled}>
              {uiText(locale, 'Следующие', 'Next')}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
export { CompanyPicker };
