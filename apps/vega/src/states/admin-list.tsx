import { displayText, uiText, label } from './text';
import { useMemo, useState } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache } from './use-prop-cache';
import { useQuery } from '@tanstack/react-query';

import { listAdminStates } from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { Alert, FormField, Select, ActionLink } from '@helicraft/atria';
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
