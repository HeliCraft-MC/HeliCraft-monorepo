import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyRegistrationPolicy, NationalCurrency } from '@helicraft/alhena';
import { Checkbox, FieldHelp, FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CurrencyPicker } from '../fx/currency-picker';

const OPTIONS = [
  {
    name: 'companyMode',
    labels: ['Регистрация компаний', 'Company registration'],
    values: ['FREE', 'APPROVAL'],
  },
  {
    name: 'foreignPlayerFounders',
    labels: ['Иностранные учредители-игроки', 'Foreign player founders'],
    values: ['ALLOW', 'DENY'],
  },
  {
    name: 'corporateFounders',
    labels: ['Компании-учредители', 'Corporate founders'],
    values: ['ALLOW', 'DOMESTIC_ONLY', 'DENY'],
  },
  {
    name: 'stateFounders',
    labels: ['Государства-учредители', 'State founders'],
    values: ['ALLOW', 'DOMESTIC_ONLY', 'DENY'],
  },
  {
    name: 'branchMode',
    labels: ['Регистрация филиалов', 'Branch registration'],
    values: ['FREE', 'APPROVAL', 'DENY'],
  },
  {
    name: 'foreignBranches',
    labels: ['Иностранные филиалы', 'Foreign branches'],
    values: ['ALLOW', 'DENY'],
  },
] as const;
const OPTION_LABELS: Readonly<Record<string, readonly [string, string]>> = {
  FREE: ['Свободная регистрация', 'Free registration'],
  APPROVAL: ['Одобрение Governance', 'Governance approval'],
  ALLOW: ['Разрешить', 'Allow'],
  DENY: ['Запретить', 'Deny'],
  DOMESTIC_ONLY: ['Только национальные', 'Domestic only'],
};
const MINOR_PER_UNIT = 100n;
const DECIMAL_PLACES = 2;
function CompanyPolicyFields({
  initial,
  currency,
  onCurrency,
}: Readonly<{
  initial: CompanyRegistrationPolicy;
  currency: NationalCurrency | null;
  onCurrency: (currency: NationalCurrency | null) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [hasFee, setHasFee] = useState(initial.registrationFee !== null);
  const toggleFee = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setHasFee(event.currentTarget.checked);
  }, []);
  const minor = BigInt(initial.registrationFee?.amountMinor ?? '0');
  const initialAmount = `${minor / MINOR_PER_UNIT}.${(minor % MINOR_PER_UNIT).toString().padStart(DECIMAL_PLACES, '0')}`;
  return (
    <>
      {OPTIONS.map((field) => (
        <FormField
          key={field.name}
          htmlFor={`${id}-${field.name}`}
          label={uiText(locale, field.labels[0], field.labels[1])}
        >
          <Select id={`${id}-${field.name}`} name={field.name} defaultValue={initial[field.name]}>
            {field.values.map((value) => (
              <option key={value} value={value}>
                {uiText(locale, ...(OPTION_LABELS[value] ?? ['', '']))}
              </option>
            ))}
          </Select>
        </FormField>
      ))}
      <FieldHelp
        showLabel
        label={uiText(locale, 'Последствия политики', 'Policy effect')}
        content={uiText(
          locale,
          'Новая редакция применяется к следующим заявкам. Изменение правил может потребовать повторной подачи ожидающей заявки; старые условия и решения сохраняются.',
          'The new revision governs subsequent applications. Policy changes can require pending applicants to resubmit; previous terms and decisions remain in history.',
        )}
      />
      <Checkbox
        name="hasFee"
        label={uiText(
          locale,
          'Регистрационный сбор с заявителя',
          'Registration fee paid by applicant',
        )}
        checked={hasFee}
        onChange={toggleFee}
      />
      {hasFee && (
        <>
          <CurrencyPicker
            name="feeCurrencyId"
            label={uiText(locale, 'Валюта сбора', 'Fee currency')}
            value={currency}
            onChange={onCurrency}
          />
          <FormField
            htmlFor={`${id}-fee`}
            label={uiText(locale, 'Регистрационный сбор', 'Registration fee')}
          >
            <TextField
              id={`${id}-fee`}
              name="registrationFee"
              inputMode="decimal"
              defaultValue={initialAmount}
              required
              maxLength={31}
            />
          </FormField>
        </>
      )}
    </>
  );
}
export { CompanyPolicyFields };
