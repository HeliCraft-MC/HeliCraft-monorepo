import type { Locale } from '../locales';
import { uiText } from '../states/text';

const REASONS: Readonly<Record<string, readonly [string, string]>> = {
  'Company registration application submitted': [
    'Заявка на регистрацию компании подана',
    'Company registration application submitted',
  ],
  'Company registration approved': [
    'Регистрация компании одобрена',
    'Company registration approved',
  ],
  'Unsubmitted company draft withdrawn': [
    'Проект учреждения компании отозван',
    'Unsubmitted company draft withdrawn',
  ],
};
function companyLifecycleReason(reason: string, locale: Locale): string {
  const translation = REASONS[reason];
  return translation === undefined ? reason : uiText(locale, translation[0], translation[1]);
}
export { companyLifecycleReason };
