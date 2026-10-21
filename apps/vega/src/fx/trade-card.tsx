import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import type { InterbankExchange, StateDetail } from '@helicraft/alhena';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { economicAuthority } from '../taxation/model';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { errorMessage } from '../account-api';
import { FxPayloadSummary } from './payload-summary';
import styles from '../monetary/monetary.module.scss';

function InterbankTradeCard({
  trade,
  state,
  actorId,
  onSaved,
}: Readonly<{
  trade: InterbankExchange;
  state: StateDetail;
  actorId: string;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview, review, confirm: handleConfirm, changeOpen: handleOpenChange } = submission;
  const payload = useMemo(
    () => ({ kind: 'APPROVE_INTERBANK_EXCHANGE' as const, tradeId: trade.id, terms: trade.terms }),
    [trade],
  );
  const display = useMemo(() => ({ currencies: trade.currencies, banks: trade.banks }), [trade]);
  const handlePropose = useCallback((): void => {
    setReview({ idempotencyKey: crypto.randomUUID(), payload });
  }, [payload, setReview]);
  return (
    <article className={styles.card}>
      <h3>
        {uiText(locale, 'Межбанковский обмен', 'Interbank exchange')} ·{' '}
        {trade.status === 'SETTLED'
          ? uiText(locale, 'Исполнен', 'Settled')
          : uiText(locale, 'Ожидает утверждений', 'Awaiting approval')}
      </h3>
      <FxPayloadSummary payload={payload} display={display} />
      {trade.status === 'PENDING' &&
        economicAuthority(state, actorId, 'APPROVE_INTERBANK_EXCHANGE') && (
          <Button onClick={handlePropose}>
            {uiText(
              locale,
              'Проверить и утвердить нашей стороной',
              'Review and approve for our state',
            )}
          </Button>
        )}
      <Dialog
        open={review !== null}
        onOpenChange={handleOpenChange}
        title={uiText(locale, 'Утвердить эти точные условия', 'Approve these exact terms')}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        <FxPayloadSummary payload={payload} display={display} />
        <Button onClick={handleConfirm} disabled={submission.pending}>
          {uiText(locale, 'Предложить решение нашей стороны', 'Propose our state decision')}
        </Button>
        {submission.error !== null && <Alert tone="danger">{errorMessage(submission.error)}</Alert>}
      </Dialog>
      {submission.savedId !== null && (
        <Alert tone="success">
          {uiText(locale, 'Решение нашей стороны сохранено.', 'Our state decision was saved.')}
        </Alert>
      )}
    </article>
  );
}
export { InterbankTradeCard };
