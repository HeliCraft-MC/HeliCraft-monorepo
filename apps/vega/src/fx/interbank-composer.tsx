// oxlint-disable import/max-dependencies -- Bilateral financial composition freezes actual selected banks, exact currency amounts and one immutable state-decision payload.
import { useCallback, useMemo, useState } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import type {
  FxDecisionDisplay,
  FxOffer,
  NationalCurrency,
  StateDetail,
  StateMonetary,
} from '@helicraft/alhena';
import { ActionPanel, Alert, Button, Dialog } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { errorMessage } from '../account-api';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { interbankPayload, isFxPayload } from './model';
import { FxPayloadSummary } from './payload-summary';
import { InterbankFields } from './interbank-fields';
import styles from '../monetary/monetary.module.scss';

function InterbankComposer({
  state,
  monetary,
  onSaved,
}: Readonly<{ state: StateDetail; monetary: StateMonetary; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const [bank, setBank] = useState<FxOffer['bank'] | null>(null);
  const [currency, setCurrency] = useState<NationalCurrency | null>(null);
  const [display, setDisplay] = useState<FxDecisionDisplay>();
  const [problem, setProblem] = useState('');
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview, review, confirm: handleConfirm, changeOpen: handleOpenChange } = submission;
  const held = useMemo(
    () =>
      monetary.currencies.filter(
        (item) =>
          item.status === 'ACTIVE' &&
          monetary.accounts.some(
            (account) =>
              account.kind === 'CENTRAL_BANK' &&
              account.currencyId === item.id &&
              BigInt(account.availableMinor ?? account.balanceMinor) > 0n,
          ),
      ),
    [monetary],
  );
  const selection = useMemo(() => ({ bank, currency }), [bank, currency]);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      try {
        const payload = interbankPayload(new FormData(event.currentTarget), {
          state,
          monetary,
          partner: bank,
        });
        setDisplay({
          currencies: [...monetary.currencies, ...(currency === null ? [] : [currency])],
          banks:
            monetary.bank === null || bank === null
              ? []
              : [
                  {
                    id: monetary.bank.id,
                    stateId: state.id,
                    name: monetary.bank.name,
                    stateName: state.configuration.name,
                  },
                  bank,
                ],
        });
        setReview({ idempotencyKey: crypto.randomUUID(), payload });
        setProblem('');
      } catch {
        setProblem(
          uiText(
            locale,
            'Выберите действующие банки, две валюты, суммы и срок.',
            'Choose active banks, two currencies, exact amounts and expiry.',
          ),
        );
      }
    },
    [state, monetary, bank, currency, setReview, locale],
  );
  return (
    <ActionPanel title={uiText(locale, 'Новая межбанковская сделка', 'New interbank trade')}>
      <form onSubmit={submit} className={styles.form}>
        <InterbankFields
          stateId={state.id}
          held={held}
          selection={selection}
          onBank={setBank}
          onCurrency={setCurrency}
        />
        <Button
          type="submit"
          disabled={
            held.length === 0 ||
            bank === null ||
            currency === null ||
            monetary.bank?.status !== 'ACTIVE'
          }
        >
          {uiText(locale, 'Проверить условия', 'Review terms')}
        </Button>
        {problem !== '' && <Alert tone="danger">{problem}</Alert>}
      </form>
      <Dialog
        open={review !== null}
        onOpenChange={handleOpenChange}
        title={uiText(locale, 'Проверьте межбанковский обмен', 'Review interbank exchange')}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        {review !== null && isFxPayload(review.payload) && (
          <FxPayloadSummary payload={review.payload} display={display} />
        )}
        <Button onClick={handleConfirm} disabled={submission.pending}>
          {uiText(locale, 'Предложить решение нашей стороны', 'Propose our state decision')}
        </Button>
        {submission.error !== null && <Alert tone="danger">{errorMessage(submission.error)}</Alert>}
      </Dialog>
      {submission.savedId !== null && (
        <Alert tone="success">
          {uiText(
            locale,
            'Решение сохранено. Сделка будет исполнена только после действительного утверждения обеих сторон.',
            'Decision saved. Settlement requires valid approval by both parties.',
          )}
        </Alert>
      )}
    </ActionPanel>
  );
}
export { InterbankComposer };
