import type { ReactElement } from 'react';
import type { FxOfferList } from '@helicraft/alhena';
import { FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function FxCurrencyFilter({
  name,
  value,
  currencies,
  label,
}: Readonly<{
  name: string;
  value: string;
  currencies: NonNullable<FxOfferList['currencies']>;
  label: string;
}>): ReactElement {
  const { locale } = useTranslation();
  return (
    <FormField htmlFor={`fx-${name}`} label={label}>
      <Select id={`fx-${name}`} name={name} defaultValue={value}>
        <option value="">{uiText(locale, 'Любая валюта', 'Any currency')}</option>
        {value !== '' && !currencies.some((currency) => currency.code === value) && (
          <option value={value}>{value}</option>
        )}
        {currencies.map((currency) => (
          <option key={currency.id} value={currency.code}>
            {displayText(currency.name, locale)} · {currency.code}
          </option>
        ))}
      </Select>
    </FormField>
  );
}

export { FxCurrencyFilter };
