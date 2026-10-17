import { useTranslation } from './i18n';
import { getRouteApi, Link, Outlet } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';

import styles from './account.module.scss';

const exact = { exact: true };
const route = getRouteApi('/admin');

export function AdminLayout(): ReactElement {
  const { text } = useTranslation();

  const { principal } = route.useRouteContext();
  return (
    <main id="main-content" className={styles.page}>
      <PageContainer>
        <div className={styles.accountLayout}>
          <nav className={styles.sidebar} aria-label={text('admin.title')}>
            <p className={styles.eyebrow}>{text('admin.title')}</p>
            <Link to="/admin" activeOptions={exact}>
              {text('common.overview')}
            </Link>
            {principal.permissions.includes('content.read') ? (
              <>
                <Link to="/admin/pages">{text('admin.pages')}</Link>
                <Link to="/admin/chronicle">{text('admin.chronicle')}</Link>
              </>
            ) : null}
            {principal.permissions.includes('users.read') ? (
              <Link to="/admin/users">{text('admin.users')}</Link>
            ) : null}
            {principal.permissions.includes('audit.read') ? (
              <Link to="/admin/audit">{text('admin.audit')}</Link>
            ) : null}
            {principal.permissions.includes('states.manage') && (
              <Link to="/admin/states">{text('states.title')}</Link>
            )}
            {principal.permissions.includes('voting.manage') && (
              <Link to="/admin/votings">{text('votings.title')}</Link>
            )}
            <Link to="/app">{text('account.myAccount')}</Link>
          </nav>
          <div className={styles.accountContent}>
            <Outlet />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
