import { useNavigate } from '@tanstack/react-router';
import { useHydrated } from './use-hydrated';
import { useCallback } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { locales, isLocale } from './locales';
import { useTranslation } from './i18n';
import styles from './site.module.scss';

function LanguageSwitcher(): ReactElement {
  const { locale, setLocale } = useTranslation();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const change = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const { value } = event.currentTarget;
      if (!isLocale(value)) {
        return;
      }
      setLocale(value);
      void navigate({
        to: '.',
        search: (previous) => ({ ...previous, lang: value }),
        replace: true,
        resetScroll: false,
      });
    },
    [navigate, setLocale],
  );
  return (
    <select
      className={styles.language}
      disabled={!hydrated}
      aria-label="Language / Язык"
      value={locale}
      onChange={change}
    >
      {Object.entries(locales).map(([code, language]) => (
        <option key={code} value={code}>
          {language.name}
        </option>
      ))}
    </select>
  );
}
export { LanguageSwitcher };
