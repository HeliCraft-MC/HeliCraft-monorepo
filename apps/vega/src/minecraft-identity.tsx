import type { ReactElement } from 'react';
import type { AccountMinecraft } from '@helicraft/alhena';
import { UserRound } from 'lucide-react';
import { useTranslation } from './i18n';
import { formatDateTime } from './date-format';
import { uiText } from './states/text';
import { useExpired } from './use-expired';
import styles from './minecraft.module.scss';

function MinecraftIdentity({ data }: Readonly<{ data: AccountMinecraft }>): ReactElement {
  const { text, locale } = useTranslation();
  const expired = useExpired(data.session?.expiresAt);
  const online = data.session?.online && !expired;
  return (
    <aside className={styles.identity} aria-label={uiText(locale, 'Ваш аккаунт', 'Your account')}>
      <div className={styles.identityHeading}>
        <UserRound aria-hidden="true" />
        <span>{uiText(locale, 'Вы входите как', 'Signing in as')}</span>
      </div>
      <strong className={styles.username}>{data.username}</strong>
      <span className={styles.presence} data-online={online}>
        <span aria-hidden="true" />
        {text(online ? 'minecraft.online' : 'minecraft.offline')}
      </span>
      <dl className={styles.identityFacts}>
        <dt>{text('minecraft.lastJoined')}</dt>
        <dd>
          {data.lastJoinedAt === null
            ? text('minecraft.never')
            : formatDateTime(data.lastJoinedAt, locale)}
        </dd>
      </dl>
      <details className={styles.details}>
        <summary>{uiText(locale, 'Идентификатор аккаунта', 'Account identifier')}</summary>
        <p className={styles.uuid}>{data.accountId}</p>
        <p className={styles.hint}>
          {uiText(
            locale,
            'UUID остаётся с вами при смене имени.',
            'Your UUID stays the same when you change your name.',
          )}
        </p>
      </details>
      <details className={styles.details}>
        <summary>{text('minecraft.activity')}</summary>
        {data.events.length === 0 ? (
          <p className={styles.hint}>{text('minecraft.noActivity')}</p>
        ) : null}
        <ol className={styles.activity}>
          {data.events.map((event) => (
            <li key={event.id}>
              <span>
                {text(
                  event.type === 'MINECRAFT_SESSION_STARTED'
                    ? 'minecraft.joined'
                    : 'minecraft.left',
                )}
              </span>
              <time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt, locale)}</time>
            </li>
          ))}
        </ol>
      </details>
    </aside>
  );
}
export { MinecraftIdentity };
