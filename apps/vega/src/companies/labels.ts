import type { CompanyAuthorityProcedure, CompanyAuthorityPolicy } from '@helicraft/alhena';
import type { Locale } from '../locales';
import { uiText } from '../states/text';

const ACTIONS: Readonly<Record<CompanyAuthorityPolicy['action'], readonly [string, string]>> = {
  AMEND_CHARTER: ['Изменение устава', 'Amend charter'],
  UPDATE_PROFILE: ['Изменение профиля', 'Update profile'],
  CREATE_OFFICE: ['Создание должности', 'Create office'],
  UPDATE_OFFICE: ['Изменение должности', 'Update office'],
  APPOINT_OFFICE_HOLDER: ['Назначение', 'Appoint office holder'],
  REMOVE_OFFICE_HOLDER: ['Отзыв должности', 'Remove office holder'],
  TRANSFER_FUNDS: ['Денежный перевод', 'Transfer funds'],
  ISSUE_SHARES: ['Выпуск акций', 'Issue shares'],
  AUTHORIZE_SHARE_TRANSFER: ['Разрешение передачи акций', 'Authorize share transfer'],
  TRANSFER_OWNED_SHARES: ['Передача принадлежащих акций', 'Transfer owned shares'],
  FOUND_COMPANY: ['Учреждение компании', 'Found company'],
  REGISTER_BRANCH: ['Регистрация филиала', 'Register branch'],
  CLOSE_BRANCH: ['Закрытие филиала', 'Close branch'],
  CLOSE_COMPANY: ['Закрытие компании', 'Close company'],
  VOTE_AS_SHAREHOLDER: ['Голосование от имени компании', 'Vote as shareholder'],
  ACCEPT_SHARE_ACQUISITION: ['Согласие на приобретение акций', 'Accept share acquisition'],
  REVOKE_SHARE_ACQUISITION: ['Отзыв согласия на акции', 'Revoke share acquisition'],
};
const PROCEDURES: Readonly<
  Record<CompanyAuthorityProcedure['mechanism'], readonly [string, string]>
> = {
  SINGLE_OFFICE: ['Одна должность', 'Single office'],
  ANY_OF_OFFICES: ['Любая из должностей', 'Any listed office'],
  MULTIPLE_OFFICES: ['Все указанные должности', 'All listed offices'],
  SHAREHOLDER_VOTE: ['Голосование акционеров с весом по акциям', 'Share-weighted shareholder vote'],
  OFFICE_VOTE: ['Голосование должностных лиц', 'Office holder vote'],
  COMBINED: ['Должности и голосование акционеров', 'Offices and shareholder vote'],
  MANUAL: ['Документированная ручная процедура', 'Documented manual procedure'],
};
function companyActionLabel(action: string, locale: Locale): string {
  const found = Object.entries(ACTIONS).find(([key]) => key === action)?.[1];
  return found
    ? uiText(locale, ...found)
    : uiText(locale, 'Корпоративное решение', 'Corporate decision');
}
function companyProcedureLabel(
  mechanism: CompanyAuthorityProcedure['mechanism'],
  locale: Locale,
): string {
  return uiText(locale, ...PROCEDURES[mechanism]);
}
const COMPANY_STATUSES: Readonly<Record<string, readonly [string, string]>> = {
  AVAILABLE: ['Действует', 'Available'],
  REVOKED: ['Отозвано', 'Revoked'],
  CONSUMED: ['Использовано', 'Consumed'],
  STALE: ['Условия или полномочия изменились', 'Terms or authority changed'],
  DRAFT: ['Черновик', 'Draft'],
  PENDING_REGISTRATION: ['Ожидает регистрации', 'Awaiting registration'],
  ACTIVE: ['Активна', 'Active'],
  SUSPENDED: ['Приостановлена', 'Suspended'],
  CLOSED: ['Закрыта', 'Closed'],
  PENDING: ['Ожидает решения', 'Pending'],
  APPROVED: ['Одобрено', 'Approved'],
  REJECTED: ['Отклонено', 'Rejected'],
  APPLIED: ['Исполнено', 'Executed'],
  CANCELLED: ['Отменено', 'Cancelled'],
  SUPERSEDED: ['Заменено новой заявкой', 'Superseded'],
};
function companyStatusLabel(status: string, locale: Locale): string {
  const names = COMPANY_STATUSES[status];
  return names === undefined
    ? uiText(locale, 'Статус недоступен', 'Status unavailable')
    : uiText(locale, names[0], names[1]);
}
export { companyActionLabel, companyProcedureLabel, companyStatusLabel };
