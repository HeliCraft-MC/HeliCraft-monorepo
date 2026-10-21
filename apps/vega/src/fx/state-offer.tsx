import { useCallback } from 'react';
import type { ReactElement } from 'react';
import type { FxOffer, StateDetail } from '@helicraft/alhena';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { economicAuthority } from '../taxation/model';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { errorMessage } from '../account-api';
import { OfferSummary } from './offer-summary';

function StateFxOffer({
  offer,
  state,
  actorId,
  onSaved,
}: Readonly<{
  offer: FxOffer;
  state: StateDetail;
  actorId: string;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview, review, confirm: handleConfirm, changeOpen: handleOpenChange } = submission;
  const handleCancel = useCallback((): void => {
    setReview({
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'CANCEL_FX_OFFER', offerId: offer.id, termsHash: offer.termsHash },
    });
  }, [offer, setReview]);
  return (
    <section>
      <OfferSummary offer={offer} />
      <a href={`/exchange/${offer.id}`}>
        {uiText(locale, 'Публичное предложение и история', 'Public offer and fills')}
      </a>
      {offer.status === 'ACTIVE' && economicAuthority(state, actorId, 'CANCEL_FX_OFFER') && (
        <Button onClick={handleCancel}>
          {uiText(locale, 'Отменить предложение', 'Cancel offer')}
        </Button>
      )}
      <Dialog
        open={review !== null}
        onOpenChange={handleOpenChange}
        title={uiText(locale, 'Отменить предложение?', 'Cancel this offer?')}
        description={uiText(
          locale,
          'После утверждения неиспользованный резерв станет доступен банку. Уже исполненные обмены сохранятся.',
          'Approval releases the unused reserve to the bank. Completed exchanges remain unchanged.',
        )}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        <OfferSummary offer={offer} />
        <Button onClick={handleConfirm} disabled={submission.pending}>
          {uiText(locale, 'Предложить отмену', 'Propose cancellation')}
        </Button>
        {submission.error !== null && <Alert tone="danger">{errorMessage(submission.error)}</Alert>}
      </Dialog>
      {submission.savedId !== null && (
        <Alert tone="success">
          {uiText(locale, 'Решение об отмене сохранено.', 'Cancellation decision saved.')}
        </Alert>
      )}
    </section>
  );
}
export { StateFxOffer };
