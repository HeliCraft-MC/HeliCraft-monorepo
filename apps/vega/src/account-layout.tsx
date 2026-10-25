import { WorkspaceNavigation, WorkspaceContent, Icon } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import styles from './account.module.scss';

const exact = { exact: true };

function accountSectionLabel(
  pathname: string,
  text: ReturnType<typeof useTranslation>['text'],
  locale: ReturnType<typeof useTranslation>['locale'],
): string {
  const sections = [
    ['/app/minecraft', text('minecraft.title')],
    ['/app/states', text('states.title')],
    ['/app/notifications', locale === 'ru' ? 'Входящие' : 'Inbox'],
    ['/app/companies', locale === 'ru' ? 'Компании' : 'Companies'],
    ['/app/shares', locale === 'ru' ? 'Мои акции' : 'My shares'],
    ['/app/wallet', text('monetary.wallet')],
    ['/app/exchange', text('fx.navigation')],
    ['/app/votings', text('votings.title')],
    ['/app/settings/profile', text('account.profile')],
    ['/app/settings/skin', text('account.skin')],
    ['/app/settings/security', text('account.security')],
    ['/app/settings', text('account.preferences')],
  ];
  return (
    sections.find(([prefix]) => prefix !== undefined && pathname.startsWith(prefix))?.[1] ??
    text('common.overview')
  );
}

function AccountLayout(): ReactElement {
  const { text, locale } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const inStates = pathname.startsWith('/app/states');
  const currentLabel = accountSectionLabel(pathname, text, locale);
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.workspaceContainer}>
        <div className={styles.accountLayout}>
          <WorkspaceNavigation
            label={text('account.myAccount')}
            currentLabel={currentLabel}
            className={styles.sidebar}
          >
            <p className={styles.eyebrow}>{text('account.myAccount')}</p>
            <Link to="/app" activeOptions={exact}>
              <Icon name="overview" />
              {text('common.overview')}
            </Link>
            <Link to="/app/minecraft">
              <Icon name="user" />
              {text('minecraft.title')}
            </Link>
            <Link to="/app/notifications">
              <Icon name="inbox" />
              {locale === 'ru' ? 'Входящие' : 'Inbox'}
            </Link>
            <Link to="/app/states/new" aria-current={inStates ? 'page' : undefined}>
              <Icon name="state" />
              {text('states.title')}
            </Link>
            <p className={styles.sidebarGroup}>{locale === 'ru' ? 'Экономика' : 'Economy'}</p>
            <Link to="/app/wallet">
              <Icon name="wallet" />
              {text('monetary.wallet')}
            </Link>
            <Link to="/app/exchange">
              <Icon name="exchange" />
              {text('fx.navigation')}
            </Link>
            <Link to="/app/companies">
              <Icon name="company" />
              {locale === 'ru' ? 'Компании' : 'Companies'}
            </Link>
            <Link to="/app/shares">
              <Icon name="shares" />
              {locale === 'ru' ? 'Мои акции' : 'My shares'}
            </Link>
            <Link to="/app/votings">
              <Icon name="vote" />
              {text('votings.title')}
            </Link>
            <p className={styles.sidebarGroup}>{locale === 'ru' ? 'Настройки' : 'Settings'}</p>
            <Link to="/app/settings/profile">
              <Icon name="user" />
              {text('account.profile')}
            </Link>
            <Link to="/app/settings/skin">
              <Icon name="skin" />
              {text('account.skin')}
            </Link>
            <Link to="/app/settings/security">
              <Icon name="security" />
              {text('account.security')}
            </Link>
            <Link to="/app/settings" activeOptions={exact}>
              <Icon name="settings" />
              {text('account.preferences')}
            </Link>
          </WorkspaceNavigation>
          <WorkspaceContent className={styles.accountContent}>
            <Outlet />
          </WorkspaceContent>
        </div>
      </div>
    </main>
  );
}

export { AccountLayout };
