import { useSiteBranding } from './site-branding';
import { Icon, ActionLink } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { Link } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { SiteNavigation } from './site-navigation';
import { AccountLinks } from './account-links';
import styles from './site.module.scss';

function SiteHeader({ home }: Readonly<{ home: boolean }>): ReactElement {
  const { text } = useTranslation();
  const branding = useSiteBranding();

  const HEADER_SCROLL_THRESHOLD = 40;
  const [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const toggleMenu = useCallback((): void => {
    setOpen((value) => !value);
  }, []);
  const closeMenu = useCallback((): void => {
    setOpen(false);
  }, []);
  useEffect((): (() => void) => {
    function update(): void {
      setScrolled(globalThis.scrollY > HEADER_SCROLL_THRESHOLD);
    }
    update();
    globalThis.addEventListener('scroll', update, { passive: true });
    return (): void => {
      globalThis.removeEventListener('scroll', update);
    };
  }, []);
  useEffect((): (() => void) => {
    function escape(event: KeyboardEvent): void {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        menuButton.current?.focus();
      }
    }
    globalThis.addEventListener('keydown', escape);
    return (): void => {
      globalThis.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <header
      className={[
        styles.header,
        home ? styles.homeHeader : '',
        scrolled || open ? styles.solid : '',
      ].join(' ')}
    >
      <div className={styles.headerInner}>
        <Link className={styles.brand} to="/" aria-label={text('navigation.homeLabel')}>
          <img src={branding.logoUrl ?? '/world/logo.png'} alt="" width="38" height="38" />
          <span>{branding.serverName}</span>
        </Link>
        <nav className={styles.navigation} aria-label={text('navigation.mainLabel')}>
          <SiteNavigation onNavigate={closeMenu} />
        </nav>
        <div className={styles.accountLinks}>
          <AccountLinks registrationEnabled={false} />
          <ActionLink href="/start">
            {text('navigation.play')} <Icon name="arrowUpRight" />
          </ActionLink>
        </div>
        <button
          ref={menuButton}
          className={styles.menuButton}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={toggleMenu}
        >
          {open ? <Icon name="close" /> : <Icon name="menu" />}
          {open ? text('common.close') : text('navigation.menu')}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          className={styles.mobileMenu}
          aria-label={text('navigation.mobileLabel')}
        >
          <SiteNavigation onNavigate={closeMenu} />
          <Link onClick={closeMenu} to="/rules">
            {text('navigation.rules')}
          </Link>
          <AccountLinks registrationEnabled={false} />
          <ActionLink href="/start">
            {text('navigation.play')} <Icon name="arrowUpRight" />
          </ActionLink>
        </nav>
      )}
    </header>
  );
}
export { SiteHeader };
