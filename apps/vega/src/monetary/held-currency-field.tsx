import { useId } from 'react';
import type { ReactElement } from 'react';
import type { NationalCurrency } from '@helicraft/alhena';
import { FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';

function HeldCurrencyField({
  currencies,
  defaultId,
}: Readonly<{
  currencies: readonly NationalCurrency[];
  defaultId: string | undefined;
}>): ReactElement {
  const { text, locale } = useTranslation();
  const id = useId();
  return (
    <FormField label={text('monetary.currency')} htmlFor={id}>
      <Select id={id} name="currencyId" defaultValue={defaultId} required>
        {currencies
          .filter((currency) => currency.status === 'ACTIVE')
          .map((currency) => (
            <option key={currency.id} value={currency.id}>
              {displayText(currency.name, locale)} · {currency.code}
            </option>
          ))}
      </Select>
    </FormField>
  );
}
export { HeldCurrencyField };
