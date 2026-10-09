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
        setMessage('Пароли не совпадают');
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        const action = registration ? register : login;
        await action({ client: browserClient(), body: { username, password }, throwOnError: true });
        const params = new URLSearchParams(globalThis.location.search);
        globalThis.location.assign(safeReturn(params.get('returnTo')));
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

  const submitLabel = registration ? 'Создать аккаунт' : 'Войти';
  return (
    <main id="main-content" className={styles.page}>
      <PageContainer narrow>
        <p className={styles.eyebrow}>HeliCraft / Твоя история</p>
        <h1>{registration ? 'Создай свою идентичность.' : 'С возвращением.'}</h1>
        {registration && !registrationEnabled ? (
          <Alert>Регистрация временно закрыта. Следи за летописью.</Alert>
        ) : null}
        <noscript>Для безопасного входа и регистрации включи JavaScript.</noscript>
        <form method="post" className={styles.form} onSubmit={handleSubmit}>
          <FormField label="Ник" htmlFor="username" hint="3–16 латинских букв, цифр или символов _">
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
            label="Пароль"
            htmlFor="password"
            hint={
              registration ? 'От 12 до 128 символов. Можно использовать длинную фразу.' : undefined
            }
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
            <FormField label="Повтори пароль" htmlFor="confirmation">
              <PasswordField
                id="confirmation"
                name="confirmation"
                required
                autoComplete="new-password"
              />
            </FormField>
          ) : null}
          {message === null ? null : <Alert tone="danger">{message}</Alert>}
          <Button
            type="submit"
            disabled={busy || !hydrated || (registration && !registrationEnabled)}
            aria-busy={busy}
          >
            {busy ? 'Подождите…' : submitLabel}
          </Button>
          <p className={styles.paragraph}>
            {registration ? (
              <>
                Уже есть аккаунт? <Link to="/login">Войти</Link>
              </>
            ) : (
              <>
                Впервые здесь? <Link to="/register">Создать аккаунт</Link>
              </>
            )}
          </p>
          {registration ? (
            <p className={styles.paragraph}>
              Email пока не нужен. Сохрани пароль в надёжном месте: автоматическое восстановление
              доступа пока не предусмотрено.
            </p>
          ) : null}
        </form>
      </PageContainer>
    </main>
  );
}
