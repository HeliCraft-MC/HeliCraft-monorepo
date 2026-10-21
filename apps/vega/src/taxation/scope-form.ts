import type { TaxRule } from '@helicraft/alhena';
import { formText } from '../monetary/model';
import { isTaxEvent } from './event-labels';

const JURISDICTIONS: readonly TaxRule['jurisdictions'][number][] = [
  'CITIZENSHIP',
  'TERRITORIAL',
  'COMPANY_REGISTRATION',
  'BRANCH_REGISTRATION',
];
function taxScopeFromForm(form: FormData): Pick<TaxRule, 'event' | 'events' | 'jurisdictions'> {
  const raw = form.getAll('events');
  const events = raw.filter((value) => isTaxEvent(value));
  if (
    raw.length !== events.length ||
    (events.length === 0 && formText(form, 'taxEventsConfigured') === 'true')
  ) {
    throw new Error('Select supported tax events');
  }
  const event = events[0] ?? 'PLAYER_TRANSFER';
  const basis = formText(form, 'basis') || 'CITIZENSHIP';
  let selected: readonly string[] = basis.split(',');
  if (basis === 'BOTH') {
    selected = ['CITIZENSHIP', 'TERRITORIAL'];
  }
  if (basis === 'ALL') {
    selected = JURISDICTIONS;
  }
  const jurisdictions = JURISDICTIONS.filter((candidate) => selected.includes(candidate));
  if (jurisdictions.length !== selected.length || jurisdictions.length === 0) {
    throw new Error('Select supported tax jurisdictions');
  }
  return { event, ...(events.length > 1 ? { events } : {}), jurisdictions };
}
export { taxScopeFromForm };
