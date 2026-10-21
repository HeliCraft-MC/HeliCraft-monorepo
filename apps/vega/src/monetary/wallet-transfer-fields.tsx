import { useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { NationalCurrency, PublishedCompanyIdentity } from '@helicraft/alhena';
import { FormField, Select, TextField } from '@helicraft/atria';
import { PlayerPicker } from '../player-picker';
import type { SelectedPlayer } from '../player-picker';
import { CompanyPicker } from '../company-picker';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';

interface WalletTransferFieldsProps {
  readonly currencies: NationalCurrency[];
  readonly kind: 'PLAYER' | 'COMPANY';
  readonly onKindChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  readonly players: SelectedPlayer[];
  readonly onPlayersChange: (players: SelectedPlayer[]) => void;
  readonly company: PublishedCompanyIdentity | null;
  readonly onCompanyChange: (company: PublishedCompanyIdentity | null) => void;
}
function WalletTransferFields({
  currencies,
  kind,
  onKindChange: handleKindChange,
  players,
  onPlayersChange: handlePlayersChange,
  company,
  onCompanyChange: handleCompanyChange,
}: WalletTransferFieldsProps): ReactElement {
  const { text, locale } = useTranslation();
  const id = useId();
  return (
    <>
      <FormField label={text('monetary.currency')} htmlFor={`${id}-currency`}>
        <Select id={`${id}-currency`} name="currencyId" required defaultValue="">
          <option value="">{text('monetary.selectCurrency')}</option>
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.code}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        label={uiText(locale, 'Тип получателя', 'Recipient type')}
        htmlFor={`${id}-recipient-kind`}
      >
        <Select id={`${id}-recipient-kind`} value={kind} onChange={handleKindChange}>
          <option value="PLAYER">{uiText(locale, 'Игрок', 'Player')}</option>
          <option value="COMPANY">{uiText(locale, 'Компания', 'Company')}</option>
        </Select>
      </FormField>
      {kind === 'PLAYER' ? (
        <PlayerPicker
          players={players}
          onChange={handlePlayersChange}
          label={text('monetary.recipient')}
        />
      ) : (
        <CompanyPicker value={company} onChange={handleCompanyChange} />
      )}
      <FormField label={text('monetary.amount')} htmlFor={`${id}-amount`}>
        <TextField
          id={`${id}-amount`}
          name="amount"
          required
          inputMode="decimal"
          maxLength={31}
          placeholder="0.00"
        />
      </FormField>
      <FormField label={text('monetary.purpose')} htmlFor={`${id}-purpose`}>
        <TextField id={`${id}-purpose`} name="purpose" maxLength={1000} />
      </FormField>
    </>
  );
}
export { WalletTransferFields };
