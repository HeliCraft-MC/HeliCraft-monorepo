import { useCallback, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import { decideMinecraftChallenge } from '@helicraft/alhena';
import type { MinecraftChallenge } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField } from '@helicraft/atria';
import { browserClient } from './account-api';
import { z } from 'zod';
import { useTranslation } from './i18n';
import { formatDateTime } from './date-format';
import styles from './account.module.scss';

const DecisionError = z.object({ code: z.string().optional() });
function decisionError(error: unknown): string {
  const parsed = DecisionError.safeParse(error);
  const code = parsed.success ? parsed.data.code : undefined;
  if (code === 'MINECRAFT_CODE_REJECTED') {
    return 'minecraft.codeRejected';
  }
  if (code === 'MINECRAFT_ADMISSION_DENIED') {
    return 'minecraft.expired';
  }
  if (code === 'RATE_LIMITED') {
    return 'minecraft.rateLimited';
  }
  if (code === 'UNAUTHENTICATED') {
    return 'minecraft.signInAgain';
  }
  return 'minecraft.unavailable';
}

interface Props {
  readonly challenge: MinecraftChallenge;
  readonly onDecided: () => Promise<unknown>;
}
function MinecraftChallengeForm({ challenge, onDecided }: Props): ReactElement {
  const { text, locale } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const submit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form, event.nativeEvent.submitter);
      const code = data.get('code');
      const decision = data.get('decision');
      if (typeof code !== 'string' || (decision !== 'APPROVE' && decision !== 'REJECT')) {
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        await decideMinecraftChallenge({
          client: browserClient(),
          path: { id: challenge.id },
          body: decision === 'APPROVE' ? { code, decision } : { decision },
          throwOnError: true,
        });
        form.reset();
        await onDecided();
      } catch (error) {
        setMessage(decisionError(error));
      }
      setBusy(false);
    },
    [challenge.id, onDecided],
  );
  const handleSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      void submit(event);
    },
    [submit],
  );
  return (
    <section className={styles.section}>
      <h2>{challenge.username}</h2>
      <p>
        {text('minecraft.requested')} {formatDateTime(challenge.createdAt, locale)}
      </p>
      <p>
        {text('minecraft.expires')} {formatDateTime(challenge.expiresAt, locale)}
      </p>
      <Alert tone="info">{text('minecraft.warning')}</Alert>
      <form method="post" className={styles.form} onSubmit={handleSubmit}>
        <FormField
          label={text('minecraft.code')}
          htmlFor={`minecraft-code-${challenge.id}`}
          hint={text('minecraft.codeHint')}
        >
          <TextField
            id={`minecraft-code-${challenge.id}`}
            name="code"
            required
            minLength={16}
            maxLength={16}
            pattern="[0-9A-Fa-f]{16}"
            autoComplete="off"
            spellCheck={false}
          />
        </FormField>
        {message === null ? null : <Alert tone="danger">{text(message)}</Alert>}
        <div className={styles.navigation}>
          <Button type="submit" name="decision" value="APPROVE" disabled={busy}>
            {text('minecraft.approve')}
          </Button>
          <Button
            type="submit"
            name="decision"
            value="REJECT"
            formNoValidate
            tone="quiet"
            disabled={busy}
          >
            {text('minecraft.reject')}
          </Button>
        </div>
      </form>
    </section>
  );
}
export { MinecraftChallengeForm };
