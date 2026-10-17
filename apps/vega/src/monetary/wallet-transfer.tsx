import { useCallback, useId, useState } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TaxBreakdown } from '../taxation/breakdown';
import { transferWallet, quoteWalletTransfer } from '@helicraft/alhena';
import type {
  NationalCurrency,
  WalletTransfer as TransferInput,
  TransferQuote,
} from '@helicraft/alhena';
import { Alert, Button, Dialog, FormField, Select, TextField } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { PlayerPicker } from '../player-picker';
import type { SelectedPlayer } from '../player-picker';
import { useTranslation } from '../i18n';
import { amountFromForm, formText } from './model';
import styles from './monetary.module.scss';

function WalletTransfer({
  currencies,
  onSaved,
}: Readonly<{ currencies: NationalCurrency[]; onSaved: () => void }>): ReactElement {
  const { text } = useTranslation();
  const id = useId();
  const [players, setPlayers] = useState<SelectedPlayer[]>([]);
  const [quote, setQuote] = useState<TransferQuote | null>(null);
  const [review, setReview] = useState<TransferInput | null>(null);
  const [problem, setProblem] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const preview = useMutation({
    mutationFn: async (input: TransferInput) => {
      const result = await quoteWalletTransfer({
        client: browserClient(),
        body: input,
        throwOnError: true,
      });
      return { input, quote: result.data };
    },
    onSuccess: (result) => {
      setQuote(result.quote);
      setReview({ ...result.input, quoteId: result.quote.id });
    },
  });
  const { mutate: calculate } = preview;
  const mutation = useMutation({
    mutationFn: async () => {
      if (review === null) {
        return null;
      }
      const result = await transferWallet({
        client: browserClient(),
        body: review,
        throwOnError: true,
      });
      return result.data.id;
    },
    onSuccess: (transactionId) => {
      setSavedId(transactionId);
      setReview(null);
      onSaved();
    },
  });
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const [recipient] = players;
      if (players.length !== 1 || !recipient) {
        setProblem(text('monetary.invalidRecipient'));
        return;
      }
      const form = new FormData(event.currentTarget);
      try {
        calculate({
          idempotencyKey: crypto.randomUUID(),
          currencyId: formText(form, 'currencyId'),
          recipientId: recipient.id,
          amountMinor: amountFromForm(form, 'amount'),
          purpose: formText(form, 'purpose'),
        });
        setProblem('');
      } catch {
        setProblem(text('monetary.invalidAmount'));
      }
    },
    [players, text, calculate],
  );
  const changeOpen = useCallback(
    (open: boolean): void => {
      if (!open && !mutation.isPending) {
        setReview(null);
      }
    },
    [mutation.isPending],
  );
  const { mutate } = mutation;
  const confirm = useCallback((): void => {
    mutate();
  }, [mutate]);
  return (
    <section className={styles.card}>
      <h2>{text('monetary.transfer')}</h2>
      {savedId !== null && (
        <Alert tone="success">
          {text('monetary.transferCompleted')} · {text('monetary.id')}: {savedId}
        </Alert>
      )}
      <form className={styles.form} onSubmit={submit}>
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
        <PlayerPicker players={players} onChange={setPlayers} label={text('monetary.recipient')} />
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
        <Button type="submit" disabled={preview.isPending}>
          {text('monetary.transfer')}
        </Button>
        {preview.isPending && <output>{text('monetary.loading')}</output>}
        {preview.error !== null && <Alert tone="danger">{errorMessage(preview.error)}</Alert>}
        {problem !== '' && <Alert tone="danger">{problem}</Alert>}
      </form>
      <Dialog
        open={review !== null}
        onOpenChange={changeOpen}
        title={text('monetary.confirmTransfer')}
        closeLabel={text('monetary.close')}
      >
        {review !== null && (
          <div className={styles.panel}>
            {quote !== null && (
              <TaxBreakdown
                calculation={quote.calculation}
                code={currencies.find((currency) => currency.id === review.currencyId)?.code ?? ''}
              />
            )}
            <p>
              {text('monetary.recipient')}: {players[0]?.name}
            </p>
            <p>{review.purpose}</p>
          </div>
        )}
        <Button disabled={mutation.isPending} onClick={confirm}>
          {text('monetary.confirmTransfer')}
        </Button>
        {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
      </Dialog>
    </section>
  );
}
export { WalletTransfer };
