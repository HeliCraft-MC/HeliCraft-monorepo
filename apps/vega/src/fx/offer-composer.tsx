// oxlint-disable import/max-dependencies -- State offer composition freezes exact terms and actual published currency/bank identities before Governance submission.
import { useCallback, useMemo, useState } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import type {
  FxDecisionDisplay,
  NationalCurrency,
  StateDetail,
  StateMonetary,
} from '@helicraft/alhena';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { errorMessage } from '../account-api';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { offerPayload, isFxPayload } from './model';
import { FxPayloadSummary } from './payload-summary';
import { OfferFields } from './offer-fields';
import styles from '../monetary/monetary.module.scss';

function OfferComposer({
  state,
  monetary,
  onSaved,
}: Readonly<{ state: StateDetail; monetary: StateMonetary; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const [receive, setReceive] = useState<NationalCurrency | null>(null);
  const [display, setDisplay] = useState<FxDecisionDisplay>();
  const [problem, setProblem] = useState('');
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview, review, confirm: handleConfirm, changeOpen: handleOpenChange } = submission;
  const held = useMemo(
    () =>
      monetary.currencies.filter(
        (currency) =>
          currency.status === 'ACTIVE' &&
          monetary.accounts.some(
            (account) =>
              account.kind === 'CENTRAL_BANK' &&
              account.currencyId === currency.id &&
              BigInt(account.availableMinor ?? account.balanceMinor) > 0n,
          ),
      ),
    [monetary],
  );
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      try {
        const payload = offerPayload(new FormData(event.currentTarget));
        setDisplay({
          currencies: [...monetary.currencies, ...(receive === null ? [] : [receive])],
          banks:
            monetary.bank === null
              ? []
              : [
                  {
                    id: monetary.bank.id,
                    stateId: state.id,
                    name: monetary.bank.name,
                    stateName: state.configuration.name,
                  },
                ],
        });
        setReview({ idempotencyKey: crypto.randomUUID(), payload });
        setProblem('');
      } catch {
        setProblem(
          uiText(
            locale,
            'Проверьте валюты, точные суммы, лоты и срок.',
            'Check currencies, exact amounts, lots and expiry.',
          ),
        );
      }
    },
    [monetary, receive, state, setReview, locale],
  );
  return (
    <section className={styles.card}>
      <h2>{uiText(locale, 'Новое обеспеченное предложение', 'New reserved offer')}</h2>
      <form onSubmit={submit} className={styles.form}>
        <OfferFields held={held} receive={receive} onReceive={setReceive} />
        <Button type="submit" disabled={held.length === 0 || monetary.bank?.status !== 'ACTIVE'}>
          {uiText(locale, 'Проверить предложение', 'Review offer')}
        </Button>
        {problem !== '' && <Alert tone="danger">{problem}</Alert>}
      </form>
      <Dialog
        open={review !== null}
        onOpenChange={handleOpenChange}
        title={uiText(locale, 'Проверьте условия и резерв', 'Review terms and reserve')}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        {review !== null && isFxPayload(review.payload) && (
          <FxPayloadSummary payload={review.payload} display={display} />
        )}
        <Button onClick={handleConfirm} disabled={submission.pending}>
          {uiText(locale, 'Предложить решение', 'Propose decision')}
        </Button>
        {submission.error !== null && <Alert tone="danger">{errorMessage(submission.error)}</Alert>}
      </Dialog>
      {submission.savedId !== null && (
        <Alert tone="success">
          {uiText(
            locale,
            'Решение сохранено. Ниже показаны его одобрения и результат.',
            'Decision saved. Its approvals and outcome are shown below.',
          )}
        </Alert>
      )}
    </section>
  );
}
export { OfferComposer };
