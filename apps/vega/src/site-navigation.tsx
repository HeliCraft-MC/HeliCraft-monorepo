import { useCallback, useRef } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from './i18n';
import { uiText } from './states/text';
import { directorySearch } from './states/directory-search';
import { catalogueSearch } from './companies/catalogue-search';
import { fxSearch } from './fx/public-data';
import styles from './site.module.scss';

const stateSearch = directorySearch.parse({});
const companySearch = catalogueSearch.parse({});
const exchangeSearch = fxSearch.parse({});
const gallerySearch = { page: 1 };

function SiteNavigation({ onNavigate }: Readonly<{ onNavigate: () => void }>): ReactElement {
  const { text, locale } = useTranslation();
  const worldMenu = useRef<HTMLDetailsElement>(null);
  const economyMenu = useRef<HTMLDetailsElement>(null);
  const close = useCallback((): void => {
    if (worldMenu.current !== null) {
      worldMenu.current.open = false;
    }
    if (economyMenu.current !== null) {
      economyMenu.current.open = false;
    }
    onNavigate();
  }, [onNavigate]);
  const escape = useCallback((event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') {
      const menu = event.currentTarget.closest('details');
      if (menu !== null) {
        menu.open = false;
      }
      menu?.querySelector('summary')?.focus();
    }
  }, []);
  return (
    <>
      <details ref={worldMenu} className={styles.navGroup}>
        <summary onKeyDown={escape}>{text('navigation.world')}</summary>
        <div>
          <Link onKeyDown={escape} onClick={close} to="/world">
            {uiText(locale, 'Обзор мира', 'World overview')}
          </Link>
          <Link onKeyDown={escape} onClick={close} to="/states" search={stateSearch}>
            {text('navigation.states')}
          </Link>
          <Link onKeyDown={escape} onClick={close} to="/gallery" search={gallerySearch}>
            {text('navigation.atlas')}
          </Link>
        </div>
      </details>
      <details ref={economyMenu} className={styles.navGroup}>
        <summary onKeyDown={escape}>{uiText(locale, 'Экономика', 'Economy')}</summary>
        <div>
          <Link onKeyDown={escape} onClick={close} to="/companies" search={companySearch}>
            {text('companies.navigation')}
          </Link>
          <Link onKeyDown={escape} onClick={close} to="/currencies">
            {text('monetary.navigation')}
          </Link>
          <Link onKeyDown={escape} onClick={close} to="/exchange" search={exchangeSearch}>
            {text('fx.navigation')}
          </Link>
        </div>
      </details>
      <Link onKeyDown={escape} onClick={close} to="/chronicle">
        {text('navigation.chronicle')}
      </Link>
    </>
  );
}
export { SiteNavigation };
