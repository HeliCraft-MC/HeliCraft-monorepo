import type { LocalizedInput } from '@helicraft/alhena';
import type { Locale } from '../locales';

function displayText(values: Readonly<LocalizedInput>, locale: Locale): string {
  for (const code of new Set([locale, 'en', 'ru'] as const)) {
    const value = values[code];
    if (value !== undefined && value.trim() !== '') {
      return value;
    }
  }
  return '';
}
const labels = {
  PROPOSAL_PENDING: ['Ожидает решения', 'Awaiting a decision'],
  PROPOSAL_PUBLISHED: ['Опубликовано', 'Published'],
  PROPOSAL_SUPERSEDED: ['Заменено новой конфигурацией', 'Superseded by a newer configuration'],
  PROPOSAL_DELETED: ['Черновик отозван', 'Draft withdrawn'],
  VOTING_DRAFT: ['Черновик', 'Draft'],
  VOTING_SCHEDULED: ['Запланировано', 'Scheduled'],
  VOTING_OPEN: ['Идёт голосование', 'Open'],
  VOTING_CLOSED: ['Завершено', 'Closed'],
  VOTING_ARCHIVED: ['В архиве', 'Archived'],
  VOTING_CANCELLED: ['Отменено', 'Cancelled'],
  CREATE_INSTITUTION: ['Учреждение институтов', 'Establish institutions'],
  CHANGE_TERRITORY: ['Изменение территории', 'Change territory'],
  SIGN_TREATY: ['Подписание договоров', 'Sign treaties'],
  ESTABLISH_TAX_OFFICE: ['Учреждение налоговой службы', 'Establish tax office'],
  CHANGE_TAX_OFFICE_CHARTER: ['Изменение устава налоговой', 'Change tax charter'],
  AMEND_TAX_LAW: ['Изменение налогового закона', 'Amend tax law'],
  AMEND_TREATY: ['Изменение договора', 'Amend treaty'],
  DENOUNCE_TREATY: ['Прекращение договора', 'Terminate treaty'],
  ESTABLISH_CENTRAL_BANK: ['Учреждение Центрального банка', 'Establish central bank'],
  CHANGE_BANK_CHARTER: ['Изменение устава банка', 'Change bank charter'],
  CREATE_CURRENCY: ['Создание валюты', 'Create currency'],
  CHANGE_MONETARY_POLICY: ['Денежная политика', 'Monetary policy'],
  BURN_CURRENCY: ['Уничтожение денег', 'Burn currency'],
  TRANSFER_CENTRAL_BANK: ['Перевод средств ЦБ', 'Transfer central bank funds'],
  ISSUE_CURRENCY: ['Выпуск валюты', 'Issue currency'],
  SPEND_TREASURY: ['Расходы казны', 'Spend treasury'],
  DECLARE_WAR: ['Объявление войны', 'Declare war'],
  DORMANT: ['Неактивно', 'Dormant'],
  DISSOLVED: ['Распущено', 'Dissolved'],
  ENACT_LAW: ['Принятие законов', 'Adopt laws'],
  REPEAL_LAW: ['Отмена законов', 'Repeal laws'],
  AMEND_GOVERNANCE: ['Изменение государственного устройства', 'Amend governance'],
  ACCEPT_CITIZEN: ['Приём граждан', 'Accept citizens'],
  REMOVE_CITIZEN: ['Исключение граждан', 'Remove citizens'],
  APPOINT_OFFICE_HOLDER: ['Назначение должностных лиц', 'Appoint office holders'],
  REMOVE_OFFICE_HOLDER: ['Снятие должностных лиц', 'Remove office holders'],
  SINGLE_OFFICE: ['Одна должность', 'Single office'],
  ANY_OF_OFFICES: ['Любая из должностей', 'Any office'],
  MULTIPLE_OFFICES: ['Все выбранные должности', 'All selected offices'],
  CITIZEN_VOTE: ['Голосование граждан', 'Citizen vote'],
  COUNCIL_VOTE: ['Голосование совета', 'Council vote'],
  COMBINED: ['Должности и голосование граждан', 'Offices and citizen vote'],
  MANUAL: ['Ручная процедура', 'Manual procedure'],
  MANUAL_PROCEDURE: ['Ручная процедура', 'Manual procedure'],
  APPOINTED_BY_OFFICE: ['Назначение другой должностью', 'Appointed by another office'],
  INDEFINITE: ['Бессрочно', 'Indefinite'],
  FIXED_TERM: ['Срочный мандат', 'Fixed term'],
  APPOINTMENT: ['Назначение', 'Appointment'],
  ELECTION: ['Выборы', 'Election'],
  COUNCIL: ['Совет', 'Council'],
  BY_APPLICATION: ['По заявке', 'By application'],
  BY_INVITATION: ['По приглашению', 'By invitation'],
  OPEN: ['Свободное вступление', 'Open entry'],
  AUTOCRACY: ['Автократия', 'Autocracy'],
  CONSTITUTIONAL_MONARCHY: ['Конституционная монархия', 'Constitutional monarchy'],
  PRESIDENTIAL_REPUBLIC: ['Президентская республика', 'Presidential republic'],
  COUNCIL_REPUBLIC: ['Республика совета', 'Council republic'],
  DIRECT_DEMOCRACY: ['Прямая демократия', 'Direct democracy'],
  CUSTOM: ['Своя структура', 'Custom structure'],
  CREATED: ['Ожидает одобрения администрации', 'Awaiting administration approval'],
  ACTIVE: ['Активно', 'Active'],
  SUSPENDED: ['Приостановлено', 'Suspended'],
  REJECTED: ['Отклонено', 'Rejected'],
  STATE_IDENTITY: ['Государство', 'State identity'],
  FOUNDERS: ['Основатели', 'Founders'],
  CITIZENSHIP_RULES: ['Правила гражданства', 'Citizenship rules'],
  OFFICES_OVERVIEW: ['Должности', 'Offices'],
  OFFICE_APPOINTMENT_RULE: ['Порядок назначения', 'Office appointment'],
  STATE_DECISION_RULE: ['Процедура решения', 'Decision rule'],
  VOTING_RULES: ['Правила голосования', 'Voting rules'],
  GOVERNANCE_SUMMARY: ['Государственное устройство', 'Governance summary'],
} satisfies Record<string, readonly [string, string]>;
function label(code: string, locale: Locale): string {
  const entry = Object.entries(labels).find(([key]) => key === code)?.[1];
  return entry?.[locale === 'ru' ? 0 : 1] ?? code;
}
function uiText(locale: Locale, russian: string, english: string): string {
  return locale === 'ru' ? russian : english;
}
export { displayText, label, uiText };
