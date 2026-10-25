import { useExpired } from './use-expired';
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAccountMinecraft } from '@helicraft/alhena';
import type { AccountMinecraft } from '@helicraft/alhena';
import { Alert, PageHeader } from '@helicraft/atria';
import { browserClient } from './account-api';
import { useTranslation } from './i18n';
import { formatDateTime } from './date-format';
import { MinecraftChallengeForm } from './minecraft-challenge';
import styles from './account.module.scss';

const REFRESH_MS = 2000;
async function accountMinecraft(): Promise<AccountMinecraft> {
  const { data } = await getAccountMinecraft({ client: browserClient(), throwOnError: true });
  return data;
}
function MinecraftPage(): ReactElement {
  const { text, locale } = useTranslation();
  const query = useQuery({
    queryKey: ['account', 'minecraft'],
    queryFn: accountMinecraft,
    refetchInterval: REFRESH_MS,
  });
  const refetch = useCallback(async (): Promise<unknown> => await query.refetch(), [query]);
  const { data } = query;
  const expired = useExpired(data?.session?.expiresAt);
  return (
    <>
      <PageHeader title={text('minecraft.title')} />
      <p className={styles.paragraph}>{text('minecraft.intro')}</p>
      {query.isPending ? <output>{text('common.loading')}</output> : null}
      {query.isError ? <Alert tone="danger">{text('minecraft.unavailable')}</Alert> : null}
      {data === undefined ? null : (
        <>
          <section className={styles.section}>
            <h2>{text('minecraft.identity')}</h2>
            <p>
              {text('auth.username')}: {data.username}
            </p>
            <p className={styles.uuid}>{data.accountId}</p>
            <p>
              {text(data.session?.online && !expired ? 'minecraft.online' : 'minecraft.offline')}
            </p>
            <p>
              {text('minecraft.lastJoined')}:{' '}
              {data.lastJoinedAt === null
                ? text('minecraft.never')
                : formatDateTime(data.lastJoinedAt, locale)}
            </p>
          </section>
          <section className={styles.section}>
            <h2>{text('minecraft.pending')}</h2>
            {data.challenges.length === 0 ? <p>{text('minecraft.noPending')}</p> : null}
            {data.challenges.map((challenge) => (
              <MinecraftChallengeForm
                key={challenge.id}
                challenge={challenge}
                onDecided={refetch}
              />
            ))}
          </section>
          <section className={styles.section}>
            <h2>{text('minecraft.activity')}</h2>
            {data.events.length === 0 ? <p>{text('minecraft.noActivity')}</p> : null}
            <ul>
              {data.events.map((event) => (
                <li key={event.id}>
                  {text(
                    event.type === 'MINECRAFT_SESSION_STARTED'
                      ? 'minecraft.joined'
                      : 'minecraft.left',
                  )}{' '}
                  · {formatDateTime(event.occurredAt, locale)}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
export { MinecraftPage };
