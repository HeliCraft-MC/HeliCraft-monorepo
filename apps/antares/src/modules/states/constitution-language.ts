import type { Locale, LocalizedInput } from '../localized-content/contracts';
import { resolveText } from '../localized-content/contracts';

const labels: Readonly<Record<string, readonly [string, string]>> = {
  ENACT_LAW: ['принятие законов', 'adopting laws'],
  REPEAL_LAW: ['отмена законов', 'repealing laws'],
  AMEND_GOVERNANCE: ['изменение государственного устройства', 'amending governance'],
  ACCEPT_CITIZEN: ['приём граждан', 'accepting citizens'],
  REMOVE_CITIZEN: ['исключение граждан', 'removing citizens'],
  APPOINT_OFFICE_HOLDER: ['назначение должностных лиц', 'appointing office holders'],
  REMOVE_OFFICE_HOLDER: ['снятие должностных лиц', 'removing office holders'],
  CREATE_INSTITUTION: ['создание учреждений', 'creating institutions'],
  CHANGE_TERRITORY: ['изменение территории', 'changing territory'],
  SIGN_TREATY: ['подписание договоров', 'signing treaties'],
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
  ISSUE_CURRENCY: ['выпуск валюты', 'issuing currency'],
  SPEND_TREASURY: ['расходы казны', 'spending treasury'],
  DECLARE_WAR: ['объявление войны', 'declaring war'],
};
function phrase(locale: Locale, russian: string, english: string): string {
  return locale === 'ru' ? russian : english;
}
function actionName(action: string, locale: Locale): string {
  const entry = labels[action];
  return entry?.[locale === 'ru' ? 0 : 1] ?? action;
}
function escapeMarkdown(value: string): string {
  return value.replaceAll(/[\\`*_[\]<>#|]/gu, String.raw`\$&`);
}
function localized(values: Readonly<LocalizedInput>, locale: Locale): string {
  return escapeMarkdown(resolveText(values, locale).value);
}
export { phrase, actionName, escapeMarkdown, localized };
