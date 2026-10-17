import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { leaveState } from '@helicraft/alhena';
import { Alert, Button, Checkbox } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './states.module.scss';

function ManagementMembership({ stateId }: Readonly<{ stateId: string }>): ReactElement {
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
          'Вы можете добровольно покинуть государство. Гражданство и текущие должности завершатся, а история сохранится. Если вы занимаете обязательную должность без другого действующего держателя, сначала потребуется назначить преемника.',
          'You may leave voluntarily. Your citizenship and current offices will end while history remains. If you are the last serving holder of a required office, appoint a successor first.',
        )}
      </p>
      <Checkbox
        label={uiText(
          locale,
          'Я понимаю последствия и хочу выйти из государства',
          'I understand the consequences and want to leave this state',
        )}
        checked={confirmed}
        onChange={confirm}
      />
      <Button disabled={!confirmed || departure.isPending} onClick={leave}>
        {uiText(locale, 'Покинуть государство', 'Leave state')}
      </Button>
      {departure.error !== null && <Alert tone="danger">{errorMessage(departure.error)}</Alert>}
    </section>
  );
}
export { ManagementMembership };
