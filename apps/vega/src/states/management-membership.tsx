import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { StateDetail } from '@helicraft/alhena';
import { leaveState } from '@helicraft/alhena';
import { Alert, Button, Checkbox } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './states.module.scss';

function ManagementMembership({
  state,
  actorId,
}: Readonly<{ state: StateDetail; actorId: string }>): ReactElement {
  const stateId = state.id;
  const holdsOffice = state.holders.some((holder) => holder.userId === actorId);
  const { locale } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const departure = useMutation({
    mutationFn: async () => {
      await leaveState({ client: browserClient(), path: { id: stateId }, throwOnError: true });
      await queryClient.invalidateQueries({ queryKey: ['my-states'] });
      await queryClient.invalidateQueries({ queryKey: ['owned-state', stateId] });
      await navigate({ to: '/app/states/new' });
    },
  });
  const confirm = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setConfirmed(event.currentTarget.checked);
  }, []);
  const { mutate } = departure;
  const leave = useCallback((): void => {
    mutate();
  }, [mutate]);
  return (
    <section className={styles.card}>
      <h2>{uiText(locale, 'Моё гражданство', 'My citizenship')}</h2>
      <p>
        {uiText(
          locale,
          'Вы можете добровольно покинуть государство, если не занимаете должностей. Сначала передайте полномочия или завершите назначение по действующей процедуре. История гражданства сохраняется.',
          'You may leave when you hold no offices. First transfer authority or end your appointment through the current procedure. Citizenship history is retained.',
        )}
      </p>
      {holdsOffice && (
        <Alert>
          {uiText(
            locale,
            'Вы занимаете должность. Выход станет доступен после освобождения всех должностей.',
            'You hold an office. Leaving becomes available after all your appointments end.',
          )}
        </Alert>
      )}
      <Checkbox
        disabled={holdsOffice}
        label={uiText(
          locale,
          'Я понимаю последствия и хочу выйти из государства',
          'I understand the consequences and want to leave this state',
        )}
        checked={confirmed}
        onChange={confirm}
      />
      <Button disabled={holdsOffice || !confirmed || departure.isPending} onClick={leave}>
        {uiText(locale, 'Покинуть государство', 'Leave state')}
      </Button>
      {departure.error !== null && <Alert tone="danger">{errorMessage(departure.error)}</Alert>}
    </section>
  );
}
export { ManagementMembership };
