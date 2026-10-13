const MINUTE_MS = 60_000;
const LOCAL_DATE_TIME_LENGTH = 16;
function localDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }
  return new Date(date.getTime() - date.getTimezoneOffset() * MINUTE_MS)
    .toISOString()
    .slice(0, LOCAL_DATE_TIME_LENGTH);
}
function isoDateTime(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}
export { localDateTime, isoDateTime };
