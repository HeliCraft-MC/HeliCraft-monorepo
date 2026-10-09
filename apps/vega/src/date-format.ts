const dateFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeZone: 'UTC' });
function formatDate(value: string | null | undefined): string {
  return value === null || value === undefined ? '—' : dateFormatter.format(new Date(value));
}
export { formatDate };
