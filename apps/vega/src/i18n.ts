import { useSiteBranding, brandText } from './site-branding';
import { useCallback, useContext } from 'react';
import { LocaleContext } from './locale-context';
import { translate } from './locales';
import type { Locale } from './locales';

function useTranslation(): {
  locale: Locale;
  text: (source: string) => string;
  setLocale: (locale: Locale) => void;
} {
  const { serverName } = useSiteBranding();
  const { locale, setLocale } = useContext(LocaleContext);
  const text = useCallback(
    (source: string): string => brandText(translate(source, locale), serverName),
    [locale, serverName],
  );
  return { locale, text, setLocale };
}
export { useTranslation };
