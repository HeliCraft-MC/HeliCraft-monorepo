import type { TaxableEventType, TaxRule, TaxJurisdictionEvidence } from '@helicraft/alhena';
import type { Locale } from '../locales';
import { uiText } from '../states/text';

const EVENT_LABELS: Record<TaxableEventType, readonly [string, string]> = {
  PLAYER_TRANSFER: ['Игрок → игрок', 'Player → player'],
  PLAYER_COMPANY_TRANSFER: ['Игрок → компания', 'Player → company'],
  COMPANY_PLAYER_TRANSFER: ['Компания → игрок', 'Company → player'],
  COMPANY_TRANSFER: ['Компания → компания', 'Company → company'],
};
const BASIS_LABELS: Record<TaxRule['jurisdictions'][number], readonly [string, string]> = {
  CITIZENSHIP: ['Гражданство', 'Citizenship'],
  TERRITORIAL: ['Территория — временно по гражданству', 'Territory — temporary citizenship proxy'],
  COMPANY_REGISTRATION: ['Регистрация компании', 'Company registration'],
  BRANCH_REGISTRATION: [
    'Филиал, указанный в утверждённом корпоративном платеже',
    'Branch attributed by the approved corporate payment',
  ],
};
const TAX_EVENTS: readonly TaxableEventType[] = [
  'PLAYER_TRANSFER',
  'PLAYER_COMPANY_TRANSFER',
  'COMPANY_PLAYER_TRANSFER',
  'COMPANY_TRANSFER',
];
function isTaxEvent(value: unknown): value is TaxableEventType {
  return TAX_EVENTS.some((event) => event === value);
}
function taxEventLabel(event: TaxableEventType, locale: Locale): string {
  const pair = EVENT_LABELS[event];
  return uiText(locale, pair[0], pair[1]);
}
function taxJurisdictionLabel(basis: TaxRule['jurisdictions'][number], locale: Locale): string {
  const pair = BASIS_LABELS[basis];
  return uiText(locale, pair[0], pair[1]);
}
function taxEvidenceLabel(evidence: TaxJurisdictionEvidence, locale: Locale): string {
  return taxJurisdictionLabel(evidence.basis, locale);
}
export { TAX_EVENTS, isTaxEvent, taxEventLabel, taxJurisdictionLabel, taxEvidenceLabel };
