// oxlint-disable import/max-dependencies -- The existing screen also composes the shared player nickname/head component.
import { PlayerNickname } from './player-nickname';
import { parsePrincipal } from './principal-schema';
import { useTranslation } from './i18n';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { Button } from '@helicraft/atria';
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
  const { text } = useTranslation();

  const hydrated = useHydrated();
  const account = useQuery({
    queryKey: ['account'],
    queryFn: currentAccount,
    select: parsePrincipal,
    enabled: hydrated,
    retry: false,
  });
  const signOut = useCallback((): void => {
    void leave();
  }, []);
  if (account.isError || account.data === undefined) {
    return (
      <>
        <Link to="/login">{text('auth.signIn')}</Link>
        {registrationEnabled ? (
          <Link className={styles.cta} to="/register">
            {text('auth.createAccount')}
          </Link>
        ) : null}
      </>
    );
  }
  const principal = account.data;
  return (
    <>
      <PlayerNickname
        id={principal.id}
        name={principal.username}
        skinId={principal.currentSkinId}
        size={32}
      />
      <Link to="/app">{text('account.title')}</Link>
      {principal.permissions.length === 0 ? null : <Link to="/admin">{text('admin.title')}</Link>}
      <Button tone="quiet" onClick={signOut}>
        {text('auth.signOut')}
      </Button>
    </>
  );
}
export { AccountLinks };
