import { useCallback, useEffect, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { LocaleContext } from './locale-context';
import type { Locale } from './locales';

function LocaleProvider({
  locale,
  children,
}: Readonly<{ locale: Locale; children: ReactNode }>): ReactElement {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const setLocale = useCallback((value: Locale): void => {
    // oxlint-disable-next-line unicorn/no-document-cookie -- This non-sensitive SSR locale preference needs broad browser support.
    document.cookie = `helicraft-language=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, []);
  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export { LocaleProvider };
