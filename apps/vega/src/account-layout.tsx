import { Link, Outlet } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import styles from './account.module.scss';

export function AccountLayout(): ReactElement {
  return (
    <main id="main-content" className={styles.page}>
      <PageContainer>
        <nav aria-label="Настройки аккаунта" className={styles.navigation}>
          <Link to="/app">Обзор</Link>
          <Link to="/app/settings/profile">Профиль</Link>
          <Link to="/app/settings/skin">Скин</Link>
          <Link to="/app/settings/security">Безопасность</Link>
        </nav>
        <Outlet />
      </PageContainer>
    </main>
  );
}
