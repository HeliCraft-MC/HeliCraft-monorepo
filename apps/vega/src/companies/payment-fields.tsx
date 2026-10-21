import { useId } from 'react';
import type { ReactElement } from 'react';
import type { CompanyWallet, LegalOwner } from '@helicraft/alhena';
import { FieldHelp, FormField, Select, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyOwnerPicker } from './owner-picker';
import { CompanyBranchPicker } from './branch-picker';

function CompanyPaymentFields({
  wallet,
  recipient,
  type,
  onType,
  onRecipient,
}: Readonly<{
  wallet: CompanyWallet;
  recipient: LegalOwner | null;
  type: LegalOwner['type'];
  onType: (type: LegalOwner['type']) => void;
  onRecipient: (owner: LegalOwner | null) => void;
}>): ReactElement {
  const id = useId();
  const { locale } = useTranslation();
  return (
    <>
      <FormField
        label={uiText(locale, 'Валюта платежа', 'Payment currency')}
        htmlFor={`${id}-currency`}
      >
        <Select id={`${id}-currency`} name="currencyId" required>
          <option value="">{uiText(locale, 'Выберите валюту', 'Choose a currency')}</option>
          {wallet.currencies
            .filter((currency) => currency.status === 'ACTIVE')
            .map((currency) => (
              <option key={currency.id} value={currency.id}>
                {displayText(currency.name, locale)} · {currency.code}
              </option>
            ))}
        </Select>
      </FormField>
      <FormField
        label={uiText(locale, 'Сумма перевода', 'Payment amount')}
        htmlFor={`${id}-amount`}
      >
        <TextField
          id={`${id}-amount`}
          name="amount"
          inputMode="decimal"
          maxLength={31}
          placeholder="0.00"
          required
        />
      </FormField>
      <CompanyOwnerPicker
        purpose="RECIPIENT"
        value={recipient}
        type={type}
        onType={onType}
        onChange={onRecipient}
      />
      <FieldHelp
        label={uiText(locale, 'Корпоративный платёж', 'Corporate payment')}
        content={uiText(
          locale,
          'Полномочие определяется уставом. Налоги и полное списание фиксируются перед одобрением. Государство-получатель означает официальный перевод в его казначейство.',
          'Authority comes from the charter. Taxes and the full debit are frozen before approval. A state recipient means an official remittance to its treasury.',
        )}
      />
      <CompanyBranchPicker companyId={wallet.companyId} />
      <FormField
        label={uiText(locale, 'Назначение платежа', 'Payment purpose')}
        htmlFor={`${id}-purpose`}
      >
        <TextField id={`${id}-purpose`} name="purpose" maxLength={1000} />
      </FormField>
    </>
  );
}
export { CompanyPaymentFields };
