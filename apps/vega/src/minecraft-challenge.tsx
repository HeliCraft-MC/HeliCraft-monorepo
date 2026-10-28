import { useCallback, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import type { MinecraftChallenge } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField } from '@helicraft/atria';
import { ArrowRight, Clock3, ShieldCheck, X } from 'lucide-react';
import { useTranslation } from './i18n';
import { MinecraftConnectionExtra } from './minecraft-connection-details';
import { MinecraftConnection } from './minecraft-connection';
import {
  useMinecraftDeadline,
  decideMinecraftSignIn,
  decisionError,
} from './minecraft-challenge-model';
import type { MinecraftDecision } from './minecraft-challenge-model';
import { uiText } from './states/text';
import styles from './minecraft.module.scss';

interface Props {
  readonly challenge: MinecraftChallenge;
  readonly onDecided: (decision: MinecraftDecision) => Promise<unknown>;
  readonly linkCode?: string;
}
function MinecraftChallengeForm({ challenge, onDecided, linkCode }: Props): ReactElement {
  const { text, locale } = useTranslation();
  const [busy, setBusy] = useState<MinecraftDecision | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [decided, setDecided] = useState(false);
  const { expired, remaining } = useMinecraftDeadline(challenge.expiresAt);
  const submit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      if (busy !== null || expired || decided) {
        return;
      }
      const form = event.currentTarget;
      const data = new FormData(form, event.nativeEvent.submitter);
      const enteredCode = data.get('code');
      const code = linkCode ?? (typeof enteredCode === 'string' ? enteredCode : '');
      const decision = data.get('decision');
      if (decision !== 'APPROVE' && decision !== 'REJECT') {
        return;
      }
      setBusy(decision);
      setMessage(null);
      try {
        await decideMinecraftSignIn({ id: challenge.id, decision, code, locale });
        form.reset();
        setDecided(true);
        await onDecided(decision);
      } catch (error) {
        setMessage(decisionError(error));
      }
      setBusy(null);
    },
    [busy, challenge.id, decided, expired, linkCode, locale, onDecided],
  );
  const handleSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      void submit(event);
    },
    [submit],
  );
  return (
    <section className={styles.challenge} aria-label={text('minecraft.pending')}>
      <header className={styles.challengeHeader}>
        <span className={styles.requestIcon}>
          <ShieldCheck aria-hidden="true" />
        </span>
        <div>
          <p className={styles.kicker}>{uiText(locale, 'Новый запрос', 'New request')}</p>
          <h2>{uiText(locale, 'Это ваш вход?', 'Is this you signing in?')}</h2>
          <p>
            {uiText(locale, 'Подключение под именем', 'Connecting as')}{' '}
            <strong>{challenge.username}</strong>
          </p>
        </div>
      </header>
      <div className={styles.deadline} data-expired={expired}>
        <Clock3 aria-hidden="true" />
        <span>
          {expired
            ? uiText(locale, 'Время истекло', 'Request expired')
            : uiText(locale, 'Осталось на подтверждение', 'Time to confirm')}
        </span>
        <time
          dateTime={challenge.expiresAt}
          title={`${text('minecraft.expires')} ${new Date(challenge.expiresAt).toLocaleTimeString(locale)}`}
        >
          {remaining}
        </time>
      </div>
      <MinecraftConnection connection={challenge.connection} />
      <form method="post" className={styles.form} onSubmit={handleSubmit} aria-busy={busy !== null}>
        {linkCode === undefined ? (
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
              className={styles.codeInput}
              placeholder="0123456789ABCDEF"
              disabled={busy !== null || expired || decided}
            />
          </FormField>
        ) : (
          <p className={styles.codeReady}>
            <ShieldCheck aria-hidden="true" />
            {uiText(locale, 'Код из ссылки получен', 'Link code received')}
          </p>
        )}
        {expired ? <Alert tone="danger">{text('minecraft.expired')}</Alert> : null}
        {message === null ? null : <Alert tone="danger">{text(message)}</Alert>}
        <p className={styles.safety}>
          {uiText(
            locale,
            'Подтверждайте только своё подключение. Чужая ссылка может дать доступ к аккаунту.',
            'Only confirm your own sign-in. Someone else’s link could give them access to your account.',
          )}
        </p>
        <div className={styles.actions}>
          <Button
            type="submit"
            name="decision"
            value="APPROVE"
            disabled={busy !== null || expired || decided}
          >
            {busy === 'APPROVE'
              ? uiText(locale, 'Подтверждаем…', 'Confirming…')
              : text('minecraft.approve')}
            <ArrowRight aria-hidden="true" />
          </Button>
          <Button
            type="submit"
            name="decision"
            value="REJECT"
            formNoValidate
            tone="quiet"
            disabled={busy !== null || expired || decided}
          >
            <X aria-hidden="true" />
            {busy === 'REJECT'
              ? uiText(locale, 'Отклоняем…', 'Rejecting…')
              : text('minecraft.reject')}
          </Button>
        </div>
      </form>
      <MinecraftConnectionExtra connection={challenge.connection} />
      <p className={styles.requested}>
        {text('minecraft.requested')}{' '}
        <time dateTime={challenge.createdAt}>
          {new Date(challenge.createdAt).toLocaleString(locale)}
        </time>
      </p>
    </section>
  );
}
export { MinecraftChallengeForm };
