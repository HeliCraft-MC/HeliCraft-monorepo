import { useId } from 'react';
import type { ReactElement } from 'react';
import type { NationalCurrency } from '@helicraft/alhena';
import { FieldHelp, FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CurrencyPicker } from './currency-picker';

function OfferFields({
  held,
  receive,
  onReceive,
}: Readonly<{
  held: readonly NationalCurrency[];
  receive: NationalCurrency | null;
  onReceive: (value: NationalCurrency | null) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  return (
    <>
      <CurrencyPicker
        name="receiveCurrencyId"
        label={uiText(locale, 'Банк получает', 'Bank receives')}
        value={receive}
        onChange={onReceive}
      />
      <FormField
        label={uiText(locale, 'Банк отдаёт из своих средств', 'Bank provides from its holdings')}
        htmlFor={`${id}-provide`}
      >
        <Select id={`${id}-provide`} name="provideCurrencyId" required>
          <option value="">{uiText(locale, 'Выберите валюту', 'Select a currency')}</option>
          {held.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {displayText(currency.name, locale)} · {currency.code}
            </option>
          ))}
        </Select>
      </FormField>
      <FieldHelp
        label={uiText(locale, 'Обеспечение предложения', 'Offer backing')}
        content={uiText(
          locale,
          'Весь объём отдаваемой валюты резервируется после утверждения. Использовать резерв в других переводах нельзя. Если свободных средств не хватит, предложение не будет опубликовано.',
          'Approval reserves the full provided amount. Other transfers cannot spend the reserve. If available funds are insufficient, publication fails.',
        )}
      />
      <FormField
        label={uiText(locale, 'Банк получает за один лот', 'Bank receives per lot')}
        htmlFor={`${id}-receive-unit`}
      >
        <TextField
          id={`${id}-receive-unit`}
          name="receivePerLot"
          inputMode="decimal"
          required
          placeholder="0.00"
          maxLength={31}
        />
      </FormField>
      <FormField
        label={uiText(locale, 'Банк отдаёт за один лот', 'Bank provides per lot')}
        htmlFor={`${id}-provide-unit`}
      >
        <TextField
          id={`${id}-provide-unit`}
          name="providePerLot"
          inputMode="decimal"
          required
          placeholder="0.00"
          maxLength={31}
        />
      </FormField>
      <FormField label={uiText(locale, 'Всего лотов', 'Total lots')} htmlFor={`${id}-total`}>
        <TextField
          id={`${id}-total`}
          name="totalLots"
          inputMode="numeric"
          pattern="[1-9][0-9]*"
          required
          maxLength={30}
        />
      </FormField>
      <FormField
        label={uiText(locale, 'Минимум лотов за обмен', 'Minimum lots per fill')}
        htmlFor={`${id}-minimum`}
      >
        <TextField
          id={`${id}-minimum`}
          name="minimumLots"
          inputMode="numeric"
          pattern="[1-9][0-9]*"
          required
          defaultValue="1"
          maxLength={30}
        />
      </FormField>
      <FormField
        label={uiText(locale, 'Действует до (местное время)', 'Expires at (local time)')}
        htmlFor={`${id}-expires`}
      >
        <TextField id={`${id}-expires`} name="expiresAt" type="datetime-local" required />
      </FormField>
    </>
  );
}
export { OfferFields };
