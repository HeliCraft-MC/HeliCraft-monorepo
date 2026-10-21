import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { TaxRule } from '@helicraft/alhena';
import { FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';

const MINOR_FACTOR = 100n;
const DECIMAL_PLACES = 2;
function thresholdInput(rule: TaxRule | undefined): string {
  const minor = BigInt(rule?.base?.kind === 'EXCESS' ? rule.base.thresholdMinor : '0');
  return `${minor / MINOR_FACTOR}.${(minor % MINOR_FACTOR).toString().padStart(DECIMAL_PLACES, '0')}`;
}

function TaxLiabilityFields({ rule }: Readonly<{ rule?: TaxRule }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [base, setBase] = useState(rule?.base?.kind ?? 'FULL_AMOUNT');
  const changeBase = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setBase(event.currentTarget.value === 'EXCESS' ? 'EXCESS' : 'FULL_AMOUNT');
  }, []);
  return (
    <>
      <FormField
        label={uiText(locale, 'Налогоплательщик', 'Taxpayer')}
        htmlFor={`${id}-payer`}
        help={uiText(
          locale,
          'Налог отправителя списывается дополнительно. Налог получателя удерживается из перевода. Оба вида могут действовать одновременно; расчёт показывает итоговые суммы.',
          'Sender tax is charged on top. Recipient tax is withheld from the transfer. Both may apply together; the quote shows the final amounts.',
        )}
      >
        <Select id={`${id}-payer`} name="taxpayer" defaultValue={rule?.taxpayer ?? 'SENDER'}>
          <option value="SENDER">{uiText(locale, 'Отправитель', 'Sender')}</option>
          <option value="RECIPIENT">{uiText(locale, 'Получатель', 'Recipient')}</option>
        </Select>
      </FormField>
      <FormField
        label={uiText(locale, 'Налоговая база', 'Tax base')}
        htmlFor={`${id}-base`}
        help={uiText(
          locale,
          'Полная сумма облагается целиком. При необлагаемом пороге налог начисляется только на превышение: 300 при пороге 100 дают базу 200. Порог задаётся в валюте перевода.',
          'The full amount is taxed in full. An allowance taxes only the excess: 300 with an allowance of 100 gives a base of 200. The allowance uses the transfer currency.',
        )}
      >
        <Select id={`${id}-base`} name="taxBase" value={base} onChange={changeBase}>
          <option value="FULL_AMOUNT">{uiText(locale, 'Полная сумма', 'Full amount')}</option>
          <option value="EXCESS">
            {uiText(locale, 'Сумма сверх порога', 'Amount above allowance')}
          </option>
        </Select>
      </FormField>
      {base === 'EXCESS' && (
        <FormField
          label={uiText(locale, 'Необлагаемый порог', 'Tax-free allowance')}
          htmlFor={`${id}-threshold`}
        >
          <TextField
            id={`${id}-threshold`}
            name="taxThreshold"
            inputMode="decimal"
            required
            defaultValue={thresholdInput(rule)}
          />
        </FormField>
      )}
    </>
  );
}
export { TaxLiabilityFields };
