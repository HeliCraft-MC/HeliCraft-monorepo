import type { Office } from './contracts';

const DAY_MS = 86_400_000;
function holderHasAuthority(office: Readonly<Office>, since: Date, now: Date): boolean {
  if (office.term === 'INDEFINITE') {
    return true;
  }
  return office.termDays !== null && since.getTime() + office.termDays * DAY_MS > now.getTime();
}
export { holderHasAuthority };
