import type { IconProps } from '@helicraft/atria';
import type { InstitutionSection } from './institution-sections';

interface InstitutionDescription {
  readonly icon: IconProps['name'];
  readonly description: readonly [string, string];
}
const institutionCatalogue: Readonly<Record<InstitutionSection, InstitutionDescription>> = {
  bank: {
    icon: 'state',
    description: ['Учреждение, статус и устав банка', 'Establishment, status and bank charter'],
  },
  currency: {
    icon: 'currency',
    description: ['Национальная валюта и её параметры', 'National currency and its settings'],
  },
  'monetary-policy': {
    icon: 'governance',
    description: ['Правила выпуска и обращения денег', 'Rules for issuing and circulating money'],
  },
  issuance: {
    icon: 'add',
    description: ['Выпуск, изъятие и история эмиссии', 'Issue, retirement and issuance history'],
  },
  'bank-finances': {
    icon: 'wallet',
    description: ['Счета и операции центрального банка', 'Central bank accounts and transactions'],
  },
  treasury: {
    icon: 'wallet',
    description: ['Средства государства и платежи', 'State funds and payments'],
  },
  taxation: {
    icon: 'tax',
    description: ['Законы, начисления и поступления', 'Laws, assessments and receipts'],
  },
  fx: {
    icon: 'exchange',
    description: ['Курсы, резервы и обмен валют', 'Rates, reserves and currency exchange'],
  },
  companies: {
    icon: 'company',
    description: [
      'Правила регистрации и заявки компаний',
      'Registration rules and company applications',
    ],
  },
};
export { institutionCatalogue };
