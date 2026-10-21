import type { Locale } from '../locales';
import { uiText } from '../states/text';

function companySaveStatus(pending: boolean, error: string | null, locale: Locale): string {
  if (pending) {
    return uiText(locale, 'Сохранение…', 'Saving…');
  }
  return error === null
    ? uiText(locale, 'Изменения сохраняются автоматически', 'Changes save automatically')
    : uiText(locale, 'Не удалось сохранить', 'Save failed');
}
function companyRegistrationStatus(
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
  locale: Locale,
): string {
  if (status === 'PENDING') {
    return uiText(locale, 'Ожидает государственного решения', 'Awaiting state decision');
  }
  return status === 'APPROVED'
    ? uiText(locale, 'Регистрация одобрена', 'Registration approved')
    : uiText(locale, 'Регистрация отклонена', 'Registration rejected');
}
export { companySaveStatus, companyRegistrationStatus };
