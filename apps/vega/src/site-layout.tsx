import { Link, Outlet, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import { AccountLinks } from './account-links';
import styles from './site.module.scss';

const rootRoute = getRouteApi('__root__');

export function SiteLayout(): ReactElement {
  const navigation = rootRoute.useLoaderData();
  return (
    <>
      <a className={styles.skip} href="#main-content">
        Перейти к содержимому
      </a>
      <header className={styles.header}>
        <PageContainer>
          <div className={styles.headerInner}>
            <Link className={styles.brand} to="/" aria-label="HeliCraft — главная">
              <span className={styles.logo} aria-hidden="true">
                ✳
              </span>{' '}
              HeliCraft
            </Link>
            <nav className={styles.navigation} aria-label="Основная навигация">
              <Link to="/world">Мир</Link>
              <Link to="/chronicle">Летопись</Link>
              <Link to="/start">Как начать</Link>
              <Link to="/rules">Правила</Link>
            </nav>
            <div className={styles.accountLinks}>
              <AccountLinks registrationEnabled={navigation.site?.registrationEnabled ?? false} />
            </div>
            <details className={styles.mobileMenu}>
              <summary>Меню</summary>
              <nav aria-label="Мобильная навигация">
                <Link to="/world">Мир</Link>
                <Link to="/chronicle">Летопись</Link>
                <Link to="/start">Как начать</Link>
                <Link to="/rules">Правила</Link>
                <AccountLinks registrationEnabled={navigation.site?.registrationEnabled ?? false} />
              </nav>
            </details>
          </div>
        </PageContainer>
      </header>
      <Outlet />
      <footer className={styles.footer}>
        <PageContainer>
          <div className={styles.footerGrid}>
            <div>
              <Link className={styles.brand} to="/">
                HeliCraft
              </Link>
              <p>
                Обычный Minecraft.
                <br />
                Необычные возможности.
              </p>
            </div>
            <nav aria-label="Навигация в подвале">
              <Link to="/world">Мир</Link>
              <Link to="/chronicle">Летопись</Link>
              <Link to="/start">Как начать</Link>
              <Link to="/rules">Правила</Link>
              {navigation.pages
                .filter((page) => page.slug !== 'rules' && page.slug !== 'start')
                .map((page) => (
                  <a key={page.id} href={`/pages/${page.slug}`}>
                    {page.title}
                  </a>
                ))}
              {navigation.site?.links.map((link) => (
                <a key={link.url} href={link.url} rel="noopener noreferrer">
                  {link.label}
                </a>
              ))}
            </nav>
            <p className={styles.small}>
              Независимый проект сообщества.
              <br />
              Не является официальным продуктом Minecraft и не связан с Mojang или Microsoft.
            </p>
          </div>
        </PageContainer>
      </footer>
    </>
  );
}
