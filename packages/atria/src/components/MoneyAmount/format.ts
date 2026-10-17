const MINOR_FACTOR = 100n;
const DECIMAL_PLACES = 2;
const DECIMAL_SAMPLE = 1.1;
function formatMoneyMinor(value: string, locale: string): string {
  const minor = BigInt(value);
  const absolute = minor < 0n ? -minor : minor;
  const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    absolute / MINOR_FACTOR,
  );
  const fraction = new Intl.NumberFormat(locale, {
    minimumIntegerDigits: DECIMAL_PLACES,
    useGrouping: false,
  }).format(absolute % MINOR_FACTOR);
  const decimal =
    new Intl.NumberFormat(locale)
      .formatToParts(DECIMAL_SAMPLE)
      .find((part) => part.type === 'decimal')?.value ?? '.';
  return `${minor < 0n ? '−' : ''}${whole}${decimal}${fraction}`;
}
function moneyInputToMinor(value: string): string | null {
  const match = /^(?<whole>0|[1-9][0-9]{0,27})(?:[.,](?<fraction>[0-9]{1,2}))?$/u.exec(
    value.trim(),
  );
  const whole = match?.groups?.whole;
  if (whole === undefined) {
    return null;
  }
  return (
    BigInt(whole) * MINOR_FACTOR +
    BigInt((match?.groups?.fraction ?? '').padEnd(DECIMAL_PLACES, '0'))
  ).toString();
}
export { formatMoneyMinor, moneyInputToMinor };
