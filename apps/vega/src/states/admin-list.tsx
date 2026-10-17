import { displayText, uiText, label } from './text';
import { useMemo, useState } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache } from './use-prop-cache';
import { useQuery } from '@tanstack/react-query';

import { listAdminStates } from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { Alert, EmptyState, FormField, Select, ActionLink } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';

import styles from './states.module.scss';

const statuses = ['CREATED', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'DORMANT', 'DISSOLVED'] as const;
function AdminStates(): ReactElement {
  const { locale } = useTranslation();
  const [status, setStatus] = useState<StateDetail['status'] | undefined>('CREATED');
  const query = useQuery({
    queryKey: ['admin-states', status],
    queryFn: async () => {
      const result = await listAdminStates({
        client: browserClient(),
        query: { status },
        throwOnError: true,
      });
      return result.data.items;
    },
  });
  const callbackScope1 = useMemo(
    () => [locale, status, setStatus, query.data, query.error],
    [locale, status, setStatus, query.data, query.error],
  );
  const cacheSelectOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Select>['onChange']>>(callbackScope1);
  return (
    <section className={styles.page}>
      <h1>{uiText(locale, 'Управление государствами', 'Manage states')}</h1>
      <p>
        {uiText(
          locale,
          'Выберите статус для проверки новых государств или работы с действующими. В карточке государства доступны причины решений, редакции и назначения.',
          'Choose a status to review new states or manage existing ones. Open a state for decision reasons, revisions and office proposals.',
        )}
      </p>
      <FormField htmlFor="admin-state-status" label={uiText(locale, 'Статус', 'Status')}>
        <Select
          id="admin-state-status"
          value={status ?? ''}
          onChange={cacheSelectOnChange('1636', (event) => {
            setStatus(statuses.find((item) => item === event.currentTarget.value));
          })}
        >
          <option value="">{uiText(locale, 'Все', 'All')}</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {label(item, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      {query.isPending && (
        <output>{uiText(locale, 'Загрузка государств…', 'Loading states…')}</output>
      )}
      {query.data?.length === 0 && (
        <EmptyState
          title={uiText(locale, 'Государств с таким статусом нет', 'No states with this status')}
        >
          {uiText(
            locale,
            'Выберите другой статус или все государства.',
            'Choose another status or all states.',
          )}
        </EmptyState>
      )}
      <ul className={styles.list}>
        {(query.data ?? []).map((state) => (
          <li key={state.id} className={styles.card}>
            <ActionLink href={`/admin/states/${state.id}`}>
              {displayText(state.name, locale) || state.slug}
            </ActionLink>
            <span>{label(state.status, locale)}</span>
          </li>
        ))}
      </ul>
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { AdminStates };
