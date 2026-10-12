import type { Locale } from './locales';

function formatDate(value: string | null | undefined, locale: Locale = 'ru'): string {
  return value === null || value === undefined
    ? '—'
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(value),
      );
}
export { formatDate };
