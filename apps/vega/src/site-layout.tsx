import { useTranslation } from './i18n';
import { Link, Outlet, getRouteApi, useRouterState } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import { SiteHeader } from './site-header';
import styles from './site.module.scss';

const rootRoute = getRouteApi('__root__');

export function SiteLayout(): ReactElement {
  const { text } = useTranslation();

  const navigation = rootRoute.useLoaderData();
  const home = useRouterState({ select: (state) => state.location.pathname === '/' });
  return (
    <>
      <a className={styles.skip} href="#main-content">
        {text('navigation.skipContent')}
      </a>
      <SiteHeader key={home ? 'home' : 'inner'} home={home} />
      <Outlet />
      <footer className={styles.footer}>
        <PageContainer>
          <div className={styles.footerGrid}>
            <div>
              <Link className={styles.brand} to="/">
                HeliCraft
              </Link>
              <p>
                {text('footer.tagline')}
                <br />
                {text('footer.description')}
              </p>
            </div>
            <nav aria-label={text('navigation.footerLabel')}>
              <Link to="/world">{text('navigation.world')}</Link>
              <Link to="/chronicle">{text('navigation.chronicle')}</Link>
              <a href="/gallery">{text('navigation.gallery')}</a>
              <a href="https://github.com/HeliCraft-MC" rel="noopener noreferrer">
                GitHub
              </a>
              <Link to="/start">{text('navigation.start')}</Link>
              <Link to="/rules">{text('navigation.rules')}</Link>
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
              {text('footer.communityProject')}
              <br />
              {text('footer.minecraftDisclaimer')}
            </p>
          </div>
        </PageContainer>
      </footer>
    </>
  );
}
