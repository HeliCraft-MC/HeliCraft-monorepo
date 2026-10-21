import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { transferPersonalShares } from '@helicraft/alhena';
import type {
  CompanyShareTransfer,
  ShareOperationView,
  TransferPersonalSharesData,
} from '@helicraft/alhena';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { ShareOperationSummary } from './share-operation-summary';
import { shareRecipientsConsented } from './share-view-model';

type TransferCommand = NonNullable<TransferPersonalSharesData['body']>;
function PersonalShareExecution({
  operation,
  view,
  actorId,
  onSaved,
}: Readonly<{
  operation: CompanyShareTransfer;
  view: ShareOperationView;
  actorId: string;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const [review, setReview] = useState<TransferCommand | null>(null);
  const mutation = useMutation({
    mutationFn: async (command: TransferCommand) => {
      const result = await transferPersonalShares({
        client: browserClient(),
        body: command,
        throwOnError: true,
      });
      return result.data;
    },
    onSuccess: () => {
      setReview(null);
      onSaved();
    },
  });
  const { mutate, isPending } = mutation;
  const prepare = useCallback((): void => {
    setReview({
      operation: structuredClone(operation),
      authorizationDecisionId: view.issuerApprovalRequired
        ? view.availableIssuerApprovalDecisionId
        : null,
      idempotencyKey: crypto.randomUUID(),
    });
  }, [operation, view.issuerApprovalRequired, view.availableIssuerApprovalDecisionId]);
  const confirm = useCallback((): void => {
    if (review !== null) {
      mutate(review);
    }
  }, [review, mutate]);
  const changeOpen = useCallback(
    (open: boolean): void => {
      if (!open && !isPending) {
        setReview(null);
      }
    },
    [isPending],
  );
  const permitted = operation.owner.type === 'PLAYER' && operation.owner.id === actorId;
  return (
    <section>
      {permitted && view.eventId === null && (
        <Button
          onClick={prepare}
          disabled={
            isPending ||
            !view.termsCurrent ||
            !shareRecipientsConsented(view) ||
            (view.issuerApprovalRequired && view.availableIssuerApprovalDecisionId === null)
          }
        >
          {uiText(locale, 'Проверить исполнение передачи', 'Review transfer execution')}
        </Button>
      )}
      <Dialog
        open={review !== null}
        onOpenChange={changeOpen}
        title={uiText(locale, 'Подтвердите передачу акций', 'Confirm share transfer')}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        {review !== null && <ShareOperationSummary operation={review.operation} />}
        <Button onClick={confirm} disabled={isPending}>
          {uiText(locale, 'Передать акции', 'Execute share transfer')}
        </Button>
        {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
      </Dialog>
    </section>
  );
}
export { PersonalShareExecution };
