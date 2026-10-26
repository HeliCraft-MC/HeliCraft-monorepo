// oxlint-disable import/max-dependencies -- The account screen composes polling, fragment navigation, translations and its existing private read model.
import { useExpired } from './use-expired';
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAccountMinecraft } from '@helicraft/alhena';
import type { AccountMinecraft } from '@helicraft/alhena';
import { Alert, PageHeader } from '@helicraft/atria';
import { browserClient } from './account-api';
import { useTranslation } from './i18n';
import { formatDateTime } from './date-format';
import { MinecraftChallengeForm } from './minecraft-challenge';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { readMinecraftLink } from './minecraft-link';
import styles from './account.module.scss';

const REFRESH_MS = 2000;
async function accountMinecraft(): Promise<AccountMinecraft> {
  const { data } = await getAccountMinecraft({ client: browserClient(), throwOnError: true });
  return data;
}
function MinecraftPage(): ReactElement {
  const { text, locale } = useTranslation();
  const hash = useLocation({ select: (location) => location.hash });
  const link = readMinecraftLink(hash);
  const navigate = useNavigate();
  const [decided, setDecided] = useState(false);
  const query = useQuery({
    queryKey: ['account', 'minecraft'],
    queryFn: accountMinecraft,
    refetchInterval: REFRESH_MS,
  });
  const refetch = useCallback(async (): Promise<void> => {
    setDecided(true);
    await navigate({ to: '/app/minecraft', hash: '', replace: true });
    await query.refetch();
  }, [navigate, query]);
  const { data } = query;
  const expired = useExpired(data?.session?.expiresAt);
  return (
    <>
      <PageHeader title={text(hash ? 'minecraft.confirmTitle' : 'minecraft.title')} />
      <p className={styles.paragraph}>{text('minecraft.intro')}</p>
      {decided ? <Alert tone="info">{text('minecraft.decisionSaved')}</Alert> : null}
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
            {hash && !data.challenges.some((challenge) => challenge.id === link?.challenge) ? (
              <Alert tone="danger">{text('minecraft.linkUnavailable')}</Alert>
            ) : null}
            {data.challenges.length === 0 ? <p>{text('minecraft.noPending')}</p> : null}
            {data.challenges
              .filter((challenge) => !hash || challenge.id === link?.challenge)
              .map((challenge) => (
                <MinecraftChallengeForm
                  key={challenge.id}
                  challenge={challenge}
                  onDecided={refetch}
                  linkCode={challenge.id === link?.challenge ? link.code : undefined}
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
