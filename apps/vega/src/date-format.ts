import type { Locale } from './locales';

function formatDate(value: string | null | undefined, locale: Locale = 'ru'): string {
  return value === null || value === undefined
    ? '—'
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(value),
      );
}
function formatDateTime(value: string, locale: Locale = 'ru'): string {
  return `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))} UTC`;
}
export { formatDate, formatDateTime };
