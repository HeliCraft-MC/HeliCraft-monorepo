import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { Button, MinecraftAvatar } from '@helicraft/atria';
import { logout } from '@helicraft/alhena';
import { browserClient, currentAccount } from './account-api';
import { useHydrated } from './use-hydrated';
import styles from './site.module.scss';

async function leave(): Promise<void> {
  try {
    await logout({ client: browserClient(), throwOnError: true });
    globalThis.location.assign('/');
  } catch {
    globalThis.location.assign('/app/settings/security');
  }
}
function AccountLinks({
  registrationEnabled,
}: Readonly<{ registrationEnabled: boolean }>): ReactElement {
  const hydrated = useHydrated();
  const account = useQuery({
    queryKey: ['account'],
    queryFn: currentAccount,
    enabled: hydrated,
    retry: false,
  });
  const signOut = useCallback((): void => {
    void leave();
  }, []);
  if (account.data === undefined) {
    return (
      <>
        <Link to="/login">Войти</Link>
        {registrationEnabled ? (
          <Link className={styles.cta} to="/register">
            Создать аккаунт
          </Link>
        ) : null}
      </>
    );
  }
  const principal = account.data;
  return (
    <>
      <Link to="/app">
        <MinecraftAvatar
          name={principal.username}
          src={`/api/v1/public/players/${principal.id}/avatar.png?v=${principal.currentSkinId ?? 'default'}`}
          size={32}
        />{' '}
        {principal.username}
      </Link>
      {principal.permissions.length === 0 ? null : <Link to="/admin">Администрация</Link>}
      <Button tone="quiet" onClick={signOut}>
        Выйти
      </Button>
    </>
  );
}
export { AccountLinks };
