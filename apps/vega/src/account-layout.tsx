import { useTranslation } from './i18n';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import styles from './account.module.scss';

const exact = { exact: true };
export function AccountLayout(): ReactElement {
  const { text, locale } = useTranslation();
  const inStates = useRouterState({
    select: (state) => state.location.pathname.startsWith('/app/states'),
  });
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.workspaceContainer}>
        <div className={styles.accountLayout}>
          <nav aria-label={text('account.myAccount')} className={styles.sidebar}>
            <p className={styles.eyebrow}>{text('account.myAccount')}</p>
            <Link to="/app" activeOptions={exact}>
              {text('common.overview')}
            </Link>
            <Link to="/app/states/new" aria-current={inStates ? 'page' : undefined}>
              {text('states.title')}
            </Link>
            <Link to="/app/wallet">{text('monetary.wallet')}</Link>
            <a href="/app/exchange">{text('fx.navigation')}</a>
            <a href="/app/companies">{locale === 'ru' ? 'Компании' : 'Companies'}</a>
            <a href="/app/shares">{locale === 'ru' ? 'Мои акции' : 'My shares'}</a>
            <Link to="/app/votings">{text('votings.title')}</Link>
            <Link to="/app/settings/profile">{text('account.profile')}</Link>
            <Link to="/app/settings/skin">{text('account.skin')}</Link>
            <Link to="/app/settings/security">{text('account.security')}</Link>
            <Link to="/app/settings" activeOptions={exact}>
              {text('account.preferences')}
            </Link>
          </nav>
          <div className={styles.accountContent}>
            <Outlet />
          </div>
        </div>
      </div>
    </main>
  );
}
