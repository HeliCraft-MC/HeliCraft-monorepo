// oxlint-disable import/max-dependencies -- Wallet confirmation binds exact quotes to immutable selected player/company identities and shared form controls.
import { useCallback, useState } from 'react';
import type { SubmitEvent, ReactElement, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TaxBreakdown } from '../taxation/breakdown';
import { transferWallet, quoteWalletTransfer } from '@helicraft/alhena';
import type {
  NationalCurrency,
  WalletTransfer as TransferInput,
  TransferQuote,
  PublishedCompanyIdentity,
} from '@helicraft/alhena';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import type { SelectedPlayer } from '../player-picker';
import { useTranslation } from '../i18n';
import { selectedWalletRecipient, walletCommand } from './wallet-recipient';
import type { WalletRecipient } from './wallet-recipient';
import { WalletTransferFields } from './wallet-transfer-fields';
import { WalletRecipientSummary } from './wallet-recipient-summary';
import styles from './monetary.module.scss';

interface QuotedTransfer {
  command: TransferInput;
  recipient: WalletRecipient;
  quote: TransferQuote;
}
function WalletTransfer({
  currencies,
  onSaved,
}: Readonly<{ currencies: NationalCurrency[]; onSaved: () => void }>): ReactElement {
  const { text } = useTranslation();
  const [players, setPlayers] = useState<SelectedPlayer[]>([]);
  const [kind, setKind] = useState<'PLAYER' | 'COMPANY'>('PLAYER');
  const [company, setCompany] = useState<PublishedCompanyIdentity | null>(null);
  const [review, setReview] = useState<QuotedTransfer | null>(null);
  const [problem, setProblem] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const preview = useMutation({
    mutationFn: async (input: Omit<QuotedTransfer, 'quote'>) => {
      const result = await quoteWalletTransfer({
        client: browserClient(),
        body: input.command,
        throwOnError: true,
      });
      return { ...input, quote: result.data };
    },
    onSuccess: (result) => {
      setReview({ ...result, command: { ...result.command, quoteId: result.quote.id } });
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
        body: review.command,
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
      const form = new FormData(event.currentTarget);
      let recipient: WalletRecipient | undefined = undefined;
      try {
        recipient = selectedWalletRecipient(kind, players, company);
      } catch {
        setProblem(text('monetary.invalidRecipient'));
        return;
      }
      try {
        calculate({ command: walletCommand(form, recipient), recipient });
        setProblem('');
      } catch {
        setProblem(text('monetary.invalidAmount'));
      }
    },
    [kind, players, company, text, calculate],
  );
  const handleKindChange = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    if (event.currentTarget.value === 'PLAYER' || event.currentTarget.value === 'COMPANY') {
      setKind(event.currentTarget.value);
    }
  }, []);
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
        <WalletTransferFields
          currencies={currencies}
          kind={kind}
          onKindChange={handleKindChange}
          players={players}
          onPlayersChange={setPlayers}
          company={company}
          onCompanyChange={setCompany}
        />
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
            <TaxBreakdown
              calculation={review.quote.calculation}
              code={
                currencies.find((currency) => currency.id === review.command.currencyId)?.code ?? ''
              }
            />
            <WalletRecipientSummary recipient={review.recipient} />
            <p>{review.command.purpose}</p>
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
