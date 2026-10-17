import { useCallback, useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { listMyStates } from '@helicraft/alhena';
import { Alert, Select } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from './text';
import styles from './management.module.scss';

function ManagementSwitcher({
  stateId,
  stateName,
}: Readonly<{ stateId: string; stateName: string }>): ReactElement {
  const { locale } = useTranslation();
  const navigate = useNavigate();
  const id = useId();
  const states = useQuery({
    queryKey: ['my-states'],
    queryFn: async () => {
      const result = await listMyStates({ client: browserClient(), throwOnError: true });
      return result.data.items;
    },
  });
  const switchState = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      void navigate({
        to: '/app/states/$stateId/manage',
        params: { stateId: event.currentTarget.value },
        search: { section: 'overview' },
      });
    },
    [navigate],
  );
  return (
    <div className={styles.switcher}>
      <label htmlFor={id}>{uiText(locale, 'Текущее государство', 'Current state')}</label>
      <Select
        id={id}
        value={stateId}
        onChange={switchState}
        disabled={!states.data || states.data.length <= 1}
      >
        {states.data?.some((state) => state.id === stateId) !== true && (
          <option value={stateId}>{stateName}</option>
        )}
        {states.data?.map((state) => (
          <option key={state.id} value={state.id}>
            {displayText(state.name, locale) || state.slug}
          </option>
        ))}
      </Select>
      {states.error !== null && <Alert tone="danger">{errorMessage(states.error)}</Alert>}
      <Link to="/app/states/new">{uiText(locale, 'Все мои государства', 'All my states')}</Link>
      <Link to="/app">{uiText(locale, 'Мой аккаунт', 'My account')}</Link>
    </div>
  );
}
export { ManagementSwitcher };
