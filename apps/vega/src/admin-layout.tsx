import { WorkspaceNavigation, WorkspaceContent, Icon } from '@helicraft/atria';
import { uiText } from './states/text';
import { useTranslation } from './i18n';
import { getRouteApi, Link, Outlet, useRouterState } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import styles from './account.module.scss';

const institutionActiveOptions = { includeSearch: false };
const institutionsSearch = { institution: 'bank' } as const;
const exact = { exact: true };
const route = getRouteApi('/admin');

function adminSectionLabel(
  pathname: string,
  text: ReturnType<typeof useTranslation>['text'],
  locale: ReturnType<typeof useTranslation>['locale'],
): string {
  const labels = [
    ['/admin/pages', text('admin.pages')],
    ['/admin/chronicle', text('admin.chronicle')],
    ['/admin/users', text('admin.users')],
    ['/admin/audit', text('admin.audit')],
    ['/admin/states', text('states.title')],
    ['/admin/territories', uiText(locale, 'Территории и миры', 'Territories and worlds')],
    ['/admin/votings', text('votings.title')],
    ['/admin/companies', uiText(locale, 'Компании', 'Companies')],
    ['/admin/institutions', uiText(locale, 'Институты', 'Institutions')],
    ['/admin/settings', uiText(locale, 'Настройки сервера', 'Server settings')],
  ];
  return (
    labels.find(([prefix]) => prefix !== undefined && pathname.startsWith(prefix))?.[1] ??
    text('common.overview')
  );
}

function AdminLayout(): ReactElement {
  const { text, locale } = useTranslation();

  const { principal } = route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const currentLabel = adminSectionLabel(pathname, text, locale);
  return (
    <main id="main-content" className={styles.adminPage}>
      <div className={styles.workspaceContainer}>
        <div className={styles.accountLayout}>
          <WorkspaceNavigation
            className={styles.sidebar}
            label={text('admin.title')}
            currentLabel={currentLabel}
          >
            <p className={styles.eyebrow}>{text('admin.title')}</p>
            <Link to="/admin" activeOptions={exact}>
              <Icon name="overview" />
              {text('common.overview')}
            </Link>
            {principal.permissions.includes('content.read') ? (
              <>
                <Link to="/admin/pages">
                  <Icon name="document" />
                  {text('admin.pages')}
                </Link>
                <Link to="/admin/chronicle">
                  <Icon name="history" />
                  {text('admin.chronicle')}
                </Link>
              </>
            ) : null}
            {principal.permissions.includes('users.read') ? (
              <Link to="/admin/users">
                <Icon name="users" />
                {text('admin.users')}
              </Link>
            ) : null}
            {principal.permissions.includes('audit.read') ? (
              <Link to="/admin/audit">
                <Icon name="security" />
                {text('admin.audit')}
              </Link>
            ) : null}
            {principal.permissions.includes('states.manage') && (
              <>
                <Link to="/admin/companies">
                  <Icon name="company" />
                  {uiText(locale, 'Компании', 'Companies')}
                </Link>
                <Link to="/admin/territories">
                  <Icon name="state" />
                  {uiText(locale, 'Территории и миры', 'Territories and worlds')}
                </Link>
                <Link to="/admin/states">
                  <Icon name="state" />
                  {text('states.title')}
                </Link>
                <Link
                  to="/admin/institutions"
                  search={institutionsSearch}
                  activeOptions={institutionActiveOptions}
                >
                  <Icon name="governance" />
                  {uiText(locale, 'Институты', 'Institutions')}
                </Link>
              </>
            )}
            {principal.permissions.includes('voting.manage') && (
              <Link to="/admin/votings">
                <Icon name="vote" />
                {text('votings.title')}
              </Link>
            )}
            {principal.permissions.includes('site.manage') && (
              <Link to="/admin/settings">
                <Icon name="settings" />
                {uiText(locale, 'Настройки сервера', 'Server settings')}
              </Link>
            )}
            <Link to="/app">
              <Icon name="overview" />
              {text('account.myAccount')}
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

export { AdminLayout };
