// oxlint-disable import/max-dependencies -- The existing screen also composes the shared player nickname/head component.
import { PlayerNickname } from './player-nickname';
import { useTranslation } from './i18n';
import { useQueryClient } from '@tanstack/react-query';
import { formatDate } from './date-format';
import { getRouteApi, useRouter } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import { changeUsername } from '@helicraft/alhena';
import { PageHeader, Alert, Button, FormField, PasswordField, TextField } from '@helicraft/atria';

import { browserClient, errorMessage } from './account-api';
import { useCopyText } from './use-copy-text';
import styles from './account.module.scss';

const route = getRouteApi('/app');

export function ProfileSettings(): ReactElement {
  const { text, locale } = useTranslation();

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
        setMessage('profile.usernameChanged');
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
      <PageHeader title={text('account.profile')} />
      <section className={styles.section}>
        <div className={styles.profile}>
          <div>
            <h2>
              <PlayerNickname
                id={principal.id}
                name={principal.username}
                skinId={principal.currentSkinId}
              />
            </h2>
            <p className={styles.paragraph}>
              {text('profile.registeredAt')} {formatDate(principal.createdAt, locale)}
            </p>
          </div>
        </div>
        <details>
          <summary>{text('profile.identifier')}</summary>
          <p className={styles.uuid}>{principal.id}</p>
          <Button tone="quiet" onClick={handleCopy}>
            {text('profile.copyUuid')}
          </Button>
        </details>
      </section>
      <h2>{text('profile.changeUsername')}</h2>
      <p className={styles.paragraph}>{text('profile.changeUsernameHint')}</p>
      <form method="post" className={styles.form} onSubmit={handleSubmit}>
        <FormField label={text('profile.newUsername')} htmlFor="new-username">
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
        <FormField label={text('auth.currentPassword')} htmlFor="current-password">
          <PasswordField
            id="current-password"
            name="currentPassword"
            required
            autoComplete="current-password"
          />
        </FormField>
        {message === null ? null : <Alert>{text(message)}</Alert>}
        <Button type="submit" disabled={busy}>
          {text('profile.saveUsername')}
        </Button>
      </form>
    </>
  );
}
