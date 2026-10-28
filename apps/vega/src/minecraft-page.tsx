// oxlint-disable import/max-dependencies -- The account screen composes polling, fragment navigation, translations and its existing private read model.
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAccountMinecraft } from '@helicraft/alhena';
import type { AccountMinecraft } from '@helicraft/alhena';
import { Alert, Button, LoadingState, PageHeader } from '@helicraft/atria';
import { Gamepad2, RotateCw } from 'lucide-react';
import { browserClient } from './account-api';
import { useTranslation } from './i18n';
import { MinecraftChallengeForm } from './minecraft-challenge';
import type { MinecraftDecision } from './minecraft-challenge-model';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { readMinecraftLink } from './minecraft-link';
import { MinecraftIdentity } from './minecraft-identity';
import { MinecraftStart } from './minecraft-start';
import { MinecraftResult } from './minecraft-result';
import { useSiteBranding } from './site-branding';
import { uiText } from './states/text';
import styles from './minecraft.module.scss';

const REFRESH_MS = 2000;
async function accountMinecraft(): Promise<AccountMinecraft> {
  const { data } = await getAccountMinecraft({ client: browserClient(), throwOnError: true });
  return data;
}
function MinecraftPage(): ReactElement {
  const { text, locale } = useTranslation();
  const { serverName } = useSiteBranding();
  const hash = useLocation({ select: (location) => location.hash });
  const link = readMinecraftLink(hash);
  const navigate = useNavigate();
  const [decided, setDecided] = useState<MinecraftDecision | null>(null);
  const query = useQuery({
    queryKey: ['account', 'minecraft'],
    queryFn: accountMinecraft,
    refetchInterval: REFRESH_MS,
  });
  const refetch = useCallback(
    async (decision: MinecraftDecision): Promise<void> => {
      setDecided(decision);
      await navigate({ to: '/app/minecraft', hash: '', replace: true });
      await query.refetch();
    },
    [navigate, query],
  );
  const retry = useCallback((): void => {
    void query.refetch();
  }, [query]);
  const { data } = query;
  const linkedUnavailable =
    Boolean(hash) &&
    !(data?.challenges.some((challenge) => challenge.id === link?.challenge) ?? false);
  return (
    <div className={styles.page}>
      <div className={styles.eyebrow}>
        <Gamepad2 aria-hidden="true" />
        {serverName}
      </div>
      <PageHeader
        title={uiText(locale, 'Вход в Minecraft', 'Minecraft sign-in')}
        description={uiText(
          locale,
          'Один аккаунт на сайте и в игре. Подтверждение — здесь, приключения — на сервере.',
          'One account for the website and the game. Confirm here, then return to your adventure.',
        )}
      />
      {query.isPending ? <LoadingState label={text('common.loading')} /> : null}
      {query.isError ? (
        <div className={styles.error}>
          <Alert tone="danger">{text('minecraft.unavailable')}</Alert>
          <Button tone="quiet" onClick={retry}>
            <RotateCw aria-hidden="true" />
            {uiText(locale, 'Повторить', 'Try again')}
          </Button>
        </div>
      ) : null}
      {data === undefined ? null : (
        <div className={styles.layout}>
          <div className={styles.primary}>
            {decided !== null && data.challenges.length === 0 && !hash ? (
              <MinecraftResult decision={decided} />
            ) : null}
            {linkedUnavailable ? (
              <section className={styles.start}>
                <h2>
                  {uiText(locale, 'Ссылка больше не действует', 'This link is no longer available')}
                </h2>
                <Alert tone="danger">{text('minecraft.linkUnavailable')}</Alert>
                <p className={styles.hint}>
                  {uiText(
                    locale,
                    'Запросите новую ссылку, переподключившись к серверу. Проверьте, что на сайте выбран ваш игровой аккаунт.',
                    'Reconnect to the server to get a new link. Make sure you are signed into your game account on this website.',
                  )}
                </p>
              </section>
            ) : null}
            {data.challenges.length === 0 && !hash && decided === null ? (
              <MinecraftStart username={data.username} />
            ) : null}
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
          </div>
          <MinecraftIdentity data={data} />
        </div>
      )}
    </div>
  );
}
export { MinecraftPage };
