import { createContext } from 'react';
import type { Locale } from './locales';

interface LocaleState {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
}
function ignoreLocale(): void {
  /* Standalone previews keep their initial language. */
}
const LocaleContext = createContext<LocaleState>({ locale: 'ru', setLocale: ignoreLocale });
export { LocaleContext };
