import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { FormField, Select, TextField } from '@helicraft/atria';
import { PlayerPicker } from '../player-picker';
import type { SelectedPlayer } from '../player-picker';
import { IssuanceStatus } from './issuance-status';
import type { NationalCurrency } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import type { DirectiveKind } from './model';
import styles from './monetary.module.scss';

function FinancialFields({
  kind,
  players,
  onPlayers,
  currency,
}: Readonly<{
  kind: DirectiveKind;
  currency: NationalCurrency | null;
  players: SelectedPlayer[];
  onPlayers: (players: SelectedPlayer[]) => void;
}>): ReactElement {
  const { text } = useTranslation();
  const id = useId();
  const [recipient, setRecipient] = useState('PLAYER');
  const change = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setRecipient(event.currentTarget.value);
  }, []);
  const transfer = kind === 'BANK_TRANSFER' || kind === 'TREASURY_TRANSFER';
  const helps: Partial<Record<DirectiveKind, string>> = {
    ISSUE: text('monetary.issuanceHelp'),
    BURN: text('monetary.burnHelp'),
  };
  const help = helps[kind] ?? text('monetary.directiveHelp');
  return (
    <div className={styles.form}>
      {kind === 'ISSUE' && currency !== null && <IssuanceStatus currency={currency} />}
      <FormField label={text('monetary.amount')} htmlFor={`${id}-amount`} help={help}>
        <TextField
          id={`${id}-amount`}
          name="amount"
          inputMode="decimal"
          required
          maxLength={31}
          placeholder="0.00"
        />
      </FormField>
      {transfer && (
        <>
          <FormField label={text('monetary.recipient')} htmlFor={`${id}-recipient`}>
            <Select id={`${id}-recipient`} name="recipientType" value={recipient} onChange={change}>
              <option value="PLAYER">{text('monetary.player')}</option>
              {kind === 'BANK_TRANSFER' ? (
                <option value="TREASURY">{text('monetary.treasury')}</option>
              ) : (
                <option value="CENTRAL_BANK">{text('monetary.bank')}</option>
              )}
            </Select>
          </FormField>
          {recipient === 'PLAYER' && (
            <PlayerPicker
              label={text('monetary.recipient')}
              players={players}
              onChange={onPlayers}
            />
          )}
        </>
      )}
      <FormField label={text('monetary.purpose')} htmlFor={`${id}-purpose`}>
        <TextField id={`${id}-purpose`} name="purpose" maxLength={1000} />
      </FormField>
    </div>
  );
}
export { FinancialFields };
