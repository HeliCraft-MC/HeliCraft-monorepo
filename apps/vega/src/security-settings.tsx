import { useTranslation } from './i18n';
import { useCallback, useState } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { changePassword, logout, logoutAll, getSessions, revokeSession } from '@helicraft/alhena';
import { Alert, Button, FormField, PasswordField } from '@helicraft/atria';
import { browserClient, errorMessage } from './account-api';
import { SessionRow } from './session-row';
import styles from './account.module.scss';

async function sessionsQuery(): Promise<Awaited<ReturnType<typeof getSessions>>['data']> {
  const { data } = await getSessions({ client: browserClient(), throwOnError: true });
  return data;
}
export function SecuritySettings(): ReactElement {
  const { text } = useTranslation();

  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: sessionsQuery });
  const submit = useCallback(async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const currentPassword = data.get('currentPassword');
    const password = data.get('password');
    if (typeof currentPassword !== 'string' || typeof password !== 'string') {
      return;
    }
    if (data.get('confirmation') !== password) {
      setMessage('auth.passwordMismatch');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await changePassword({
        client: browserClient(),
        body: { currentPassword, password },
        throwOnError: true,
      });
      globalThis.location.assign('/login');
    } catch (error) {
      setMessage(errorMessage(error));
      setBusy(false);
    }
  }, []);
  const leave = useCallback(async (all: boolean): Promise<void> => {
    try {
      await (all ? logoutAll : logout)({ client: browserClient(), throwOnError: true });
      globalThis.location.assign('/login');
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }, []);
  const revoke = useCallback(
    async (id: string, current: boolean): Promise<void> => {
      try {
        await revokeSession({ client: browserClient(), path: { id }, throwOnError: true });
        if (current) {
          globalThis.location.assign('/login');
        } else {
          await sessions.refetch();
        }
      } catch (error) {
        setMessage(errorMessage(error));
      }
    },
    [sessions],
  );
  const handleSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      void submit(event);
    },
    [submit],
  );

  const handleLogout = useCallback((): void => {
    void leave(false);
  }, [leave]);
  const handleLogoutAll = useCallback((): void => {
    void leave(true);
  }, [leave]);
  return (
    <>
      <h1>{text('account.security')}</h1>
      <p className={styles.paragraph}>{text('security.passwordChangeHint')}</p>
      <form method="post" className={styles.form} onSubmit={handleSubmit}>
        <FormField label={text('auth.currentPassword')} htmlFor="current-password">
          <PasswordField
            id="current-password"
            name="currentPassword"
            required
            autoComplete="current-password"
          />
        </FormField>
        <FormField label={text('security.newPassword')} htmlFor="new-password">
          <PasswordField
            id="new-password"
            name="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </FormField>
        <FormField label={text('auth.confirmPassword')} htmlFor="password-confirmation">
          <PasswordField
            id="password-confirmation"
            name="confirmation"
            required
            autoComplete="new-password"
          />
        </FormField>
        {message === null ? null : <Alert>{text(message)}</Alert>}
        <Button type="submit" disabled={busy}>
          {text('security.changePassword')}
        </Button>
      </form>
      <section className={styles.section}>
        <h2>{text('security.activeSessions')}</h2>
        {sessions.data?.map((session) => (
          <SessionRow key={session.id} session={session} onRevoke={revoke} />
        ))}
        {sessions.isError ? (
          <Alert tone="danger">{text('security.sessionsUnavailable')}</Alert>
        ) : null}
        <div className={styles.navigation}>
          <Button tone="quiet" onClick={handleLogout}>
            {text('auth.signOut')}
          </Button>
          <Button tone="quiet" onClick={handleLogoutAll}>
            {text('security.signOutEverywhere')}
          </Button>
        </div>
      </section>
    </>
  );
}
