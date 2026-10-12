import { useTranslation } from './i18n';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import styles from './account.module.scss';

const exact = { exact: true };
export function AccountLayout(): ReactElement {
  const { text } = useTranslation();
  const gallery = useLocation({
    select: (location) => location.pathname.startsWith('/app/gallery/'),
  });
  return (
    <main id="main-content" className={styles.page}>
      <PageContainer>
        {gallery ? (
          <Outlet />
        ) : (
          <div className={styles.accountLayout}>
            <nav aria-label={text('account.myAccount')} className={styles.sidebar}>
              <p className={styles.eyebrow}>{text('account.myAccount')}</p>
              <Link to="/app" activeOptions={exact}>
                {text('common.overview')}
              </Link>
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
        )}
      </PageContainer>
    </main>
  );
}
