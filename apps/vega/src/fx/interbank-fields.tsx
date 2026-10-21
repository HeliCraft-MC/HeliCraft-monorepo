import { useId } from 'react';
import type { ReactElement } from 'react';
import type { FxOffer, NationalCurrency } from '@helicraft/alhena';
import { FieldHelp, FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { FxBankPicker } from './bank-picker';
import { CurrencyPicker } from './currency-picker';

interface InterbankSelection {
  bank: FxOffer['bank'] | null;
  currency: NationalCurrency | null;
}
function InterbankFields({
  stateId,
  held,
  selection,
  onBank,
  onCurrency,
}: Readonly<{
  stateId: string;
  held: readonly NationalCurrency[];
  selection: InterbankSelection;
  onBank: (bank: FxOffer['bank'] | null) => void;
  onCurrency: (currency: NationalCurrency | null) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  return (
    <>
      <FxBankPicker excludeStateId={stateId} value={selection.bank} onChange={onBank} />
      <FormField
        label={uiText(locale, 'Наш банк предоставляет', 'Our bank provides')}
        htmlFor={`${id}-first-currency`}
      >
        <Select id={`${id}-first-currency`} name="firstCurrencyId" required>
          <option value="">{uiText(locale, 'Выберите валюту', 'Select a currency')}</option>
          {held.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {displayText(currency.name, locale)} · {currency.code}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        label={uiText(locale, 'Сумма нашего банка', 'Amount provided by our bank')}
        htmlFor={`${id}-first-amount`}
      >
        <TextField
          id={`${id}-first-amount`}
          name="firstAmount"
          inputMode="decimal"
          required
          maxLength={31}
          placeholder="0.00"
        />
      </FormField>
      <CurrencyPicker
        name="secondCurrencyId"
        label={uiText(locale, 'Другой банк предоставляет', 'Counterparty bank provides')}
        value={selection.currency}
        onChange={onCurrency}
      />
      <FormField
        label={uiText(locale, 'Сумма другого банка', 'Amount provided by counterparty')}
        htmlFor={`${id}-second-amount`}
      >
        <TextField
          id={`${id}-second-amount`}
          name="secondAmount"
          inputMode="decimal"
          required
          maxLength={31}
          placeholder="0.00"
        />
      </FormField>
      <FormField
        label={uiText(
          locale,
          'Сделка действует до (местное время)',
          'Trade expires at (local time)',
        )}
        htmlFor={`${id}-expiry`}
      >
        <TextField id={`${id}-expiry`} name="expiresAt" type="datetime-local" required />
      </FormField>
      <FieldHelp
        label={uiText(locale, 'Утверждение обеих сторон', 'Bilateral approval')}
        content={uiText(
          locale,
          'Ваше решение само по себе не переводит деньги. Другой банк должен утвердить эти же неизменяемые условия по своему Governance. Перед обменом заново проверяются полномочия и свободные остатки обеих сторон.',
          'Your decision alone does not move funds. The other bank must approve these exact immutable terms through its own Governance. Authority and available balances of both parties are rechecked before settlement.',
        )}
      />
    </>
  );
}
export { InterbankFields, type InterbankSelection };
