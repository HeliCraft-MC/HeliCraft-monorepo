import { Icon, ActionLink } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { Link } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { AccountLinks } from './account-links';
import styles from './site.module.scss';

function SiteHeader({ home }: Readonly<{ home: boolean }>): ReactElement {
  const { text } = useTranslation();

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
      if (event.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
    }
    globalThis.addEventListener('keydown', escape);
    return (): void => {
      globalThis.removeEventListener('keydown', escape);
    };
  }, []);
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
          <img src="/world/logo.png" alt="" width="38" height="38" />
          HeliCraft
        </Link>
        <nav className={styles.navigation} aria-label={text('navigation.mainLabel')}>
          <Link onClick={closeMenu} to="/world">
            {text('navigation.world')}
          </Link>
          <a onClick={closeMenu} href="/#states">
            {text('navigation.states')}
          </a>
          <a onClick={closeMenu} href="/gallery">
            {text('navigation.atlas')}
          </a>
          <Link onClick={closeMenu} to="/chronicle">
            {text('navigation.chronicle')}
          </Link>
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
          <Link onClick={closeMenu} to="/world">
            {text('navigation.world')}
          </Link>
          <a onClick={closeMenu} href="/#states">
            {text('navigation.states')}
          </a>
          <a onClick={closeMenu} href="/gallery">
            {text('navigation.atlas')}
          </a>
          <Link onClick={closeMenu} to="/chronicle">
            {text('navigation.chronicle')}
          </Link>
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
