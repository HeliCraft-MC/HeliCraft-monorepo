import type { CompanyRegistrationPolicy } from '@helicraft/alhena';
import type { Locale } from '../locales';
import { uiText } from '../states/text';

function founderRule(
  value: CompanyRegistrationPolicy['corporateFounders'],
  locale: Locale,
  kind: 'corporate' | 'state',
): string {
  if (value === 'ALLOW') {
    return uiText(locale, 'Разрешены', 'Allowed');
  }
  if (value === 'DENY') {
    return uiText(locale, 'Запрещены', 'Denied');
  }
  return kind === 'corporate'
    ? uiText(locale, 'Только национальные', 'Domestic only')
    : uiText(locale, 'Только государство регистрации', 'Registration state only');
}
function branchRule(value: CompanyRegistrationPolicy['branchMode'], locale: Locale): string {
  if (value === 'FREE') {
    return uiText(locale, 'Свободная регистрация', 'Free registration');
  }
  return value === 'APPROVAL'
    ? uiText(locale, 'Государственное одобрение', 'State approval required')
    : uiText(locale, 'Запрещены', 'Denied');
}
export { founderRule, branchRule };
