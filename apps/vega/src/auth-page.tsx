import { useTranslation } from './i18n';
import { useCallback, useState } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { login, register } from '@helicraft/alhena';
import {
  Alert,
  Button,
  FormField,
  PageContainer,
  PasswordField,
  TextField,
} from '@helicraft/atria';
import { browserClient, errorMessage, safeReturn } from './account-api';
import { useHydrated } from './use-hydrated';
import styles from './account.module.scss';

const MIN_PASSWORD_LENGTH = 12;
export function AuthPage({
  registrationEnabled = true,
}: Readonly<{ registrationEnabled?: boolean }>): ReactElement {
  const { text } = useTranslation();

  const hydrated = useHydrated();
  const location = useLocation();
  const registration = location.pathname === '/register';
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const username = form.get('username');
      const password = form.get('password');
      if (typeof username !== 'string' || typeof password !== 'string') {
        return;
      }
      if (registration && form.get('confirmation') !== password) {
        setMessage('auth.passwordMismatch');
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        const action = registration ? register : login;
        await action({ client: browserClient(), body: { username, password }, throwOnError: true });
        const params = new URLSearchParams(globalThis.location.search);
        globalThis.location.assign(
          `${safeReturn(params.get('returnTo'))}${globalThis.location.hash}`,
        );
      } catch (error) {
        setMessage(errorMessage(error));
        setBusy(false);
      }
    },
    [registration],
  );
  const handleSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      void submit(event);
    },
    [submit],
  );

  const submitLabel = registration ? 'auth.createAccount' : 'auth.signIn';
  return (
    <main id="main-content" className={styles.page}>
      <PageContainer narrow>
        <h1>{registration ? text('auth.createAccount') : text('auth.signInTitle')}</h1>
        {registration && !registrationEnabled ? (
          <Alert>{text('auth.registrationClosed')}</Alert>
        ) : null}
        <noscript>{text('auth.javascriptRequired')}</noscript>
        <form method="post" className={styles.form} onSubmit={handleSubmit}>
          <FormField
            label={text('auth.username')}
            htmlFor="username"
            hint={text('auth.usernameHint')}
          >
            <TextField
              id="username"
              name="username"
              required
              minLength={3}
              maxLength={16}
              pattern="[A-Za-z0-9_]+"
              autoComplete="username"
              aria-describedby="username-hint"
            />
          </FormField>
          <FormField
            label={text('auth.password')}
            htmlFor="password"
            hint={registration ? text('auth.passwordHint') : undefined}
          >
            <PasswordField
              id="password"
              name="password"
              required
              minLength={registration ? MIN_PASSWORD_LENGTH : 1}
              maxLength={128}
              autoComplete={registration ? 'new-password' : 'current-password'}
              aria-describedby={registration ? 'password-hint' : undefined}
            />
          </FormField>
          {registration ? (
            <FormField label={text('auth.confirmPassword')} htmlFor="confirmation">
              <PasswordField
                id="confirmation"
                name="confirmation"
                required
                autoComplete="new-password"
              />
            </FormField>
          ) : null}
          {message === null ? null : <Alert tone="danger">{text(message)}</Alert>}
          <Button
            type="submit"
            disabled={busy || !hydrated || (registration && !registrationEnabled)}
            aria-busy={busy}
          >
            {busy ? text('common.pleaseWait') : text(submitLabel)}
          </Button>
          <p className={styles.paragraph}>
            {registration ? (
              <>
                {text('auth.existingAccount')} <Link to="/login">{text('auth.signIn')}</Link>
              </>
            ) : (
              <>
                {text('auth.newAccount')} <Link to="/register">{text('auth.createAccount')}</Link>
              </>
            )}
          </p>
          {registration ? (
            <p className={styles.paragraph}>{text('auth.passwordRecoveryHint')}</p>
          ) : null}
        </form>
      </PageContainer>
    </main>
  );
}
