import { useQueryClient } from '@tanstack/react-query';
import { formatDate } from './date-format';
import { getRouteApi, useRouter } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import { changeUsername } from '@helicraft/alhena';
import { Alert, Button, FormField, PasswordField, TextField } from '@helicraft/atria';

import { browserClient, errorMessage } from './account-api';
import { useCopyText } from './use-copy-text';
import styles from './account.module.scss';

const route = getRouteApi('/app');

export function ProfileSettings(): ReactElement {
  const { principal } = route.useRouteContext();
  const router = useRouter();
  const queries = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const username = data.get('username');
      const currentPassword = data.get('currentPassword');
      if (typeof username !== 'string' || typeof currentPassword !== 'string') {
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        await changeUsername({
          client: browserClient(),
          body: { username, currentPassword },
          throwOnError: true,
        });
        await queries.invalidateQueries({ queryKey: ['account'] });
        await router.invalidate();
        setMessage('Ник изменён. UUID сохранился.');
      } catch (error) {
        setMessage(errorMessage(error));
      }
      setBusy(false);
    },
    [router, queries],
  );
  const handleSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      void submit(event);
    },
    [submit],
  );

  const handleCopy = useCopyText(principal.id, setMessage);
  return (
    <>
      <h1>Профиль</h1>
      <p className={styles.uuid}>{principal.id}</p>
      <Button tone="quiet" onClick={handleCopy}>
        Копировать UUID
      </Button>
      <p className={styles.paragraph}>Зарегистрирован: {formatDate(principal.createdAt)}</p>
      <form method="post" className={styles.form} onSubmit={handleSubmit}>
        <FormField label="Новый ник" htmlFor="new-username">
          <TextField
            id="new-username"
            name="username"
            defaultValue={principal.username}
            required
            minLength={3}
            maxLength={16}
            pattern="[A-Za-z0-9_]+"
            autoComplete="username"
          />
        </FormField>
        <FormField label="Текущий пароль" htmlFor="current-password">
          <PasswordField
            id="current-password"
            name="currentPassword"
            required
            autoComplete="current-password"
          />
        </FormField>
        {message === null ? null : <Alert>{message}</Alert>}
        <Button type="submit" disabled={busy}>
          Сохранить ник
        </Button>
      </form>
    </>
  );
}
