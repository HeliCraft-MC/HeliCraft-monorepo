import { getRouteApi, Link, Outlet } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';

import styles from './account.module.scss';

const route = getRouteApi('/admin');

export function AdminLayout(): ReactElement {
  const { principal } = route.useRouteContext();
  return (
    <main id="main-content" className={styles.page}>
      <PageContainer>
        <p className={styles.eyebrow}>HeliCraft / Администрация</p>
        <nav className={styles.navigation} aria-label="Администрация">
          <Link to="/admin">Обзор</Link>
          {principal.permissions.includes('content.read') ? (
            <>
              <Link to="/admin/pages">Страницы</Link>
              <Link to="/admin/chronicle">Летопись</Link>
            </>
          ) : null}
          {principal.permissions.includes('users.read') ? (
            <Link to="/admin/users">Пользователи</Link>
          ) : null}
          {principal.permissions.includes('audit.read') ? (
            <Link to="/admin/audit">Аудит</Link>
          ) : null}
          <Link to="/app">Мой аккаунт</Link>
        </nav>
        <Outlet />
      </PageContainer>
    </main>
  );
}
