import type { ReactElement } from 'react';
import type { PublishedCompanyIdentity, StateDetail, StateMonetary } from '@helicraft/alhena';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { errorMessage } from '../account-api';
import type { useDirectiveSubmission } from './use-directive-submission';
import { PayloadSummary } from './payload-summary';

function DirectiveReview({
  submission,
  state,
  monetary,
  company,
}: Readonly<{
  submission: ReturnType<typeof useDirectiveSubmission>;
  state: StateDetail;
  monetary: StateMonetary;
  company: PublishedCompanyIdentity | null;
}>): ReactElement {
  const { text } = useTranslation();
  const { review, confirm, changeOpen } = submission;
  const code =
    monetary.currencies.find(
      (currency) =>
        review !== null &&
        'currencyId' in review.payload &&
        currency.id === review.payload.currencyId,
    )?.code ?? '';
  return (
    <Dialog
      open={review !== null}
      onOpenChange={changeOpen}
      title={text('monetary.confirm')}
      description={text('monetary.directiveHelp')}
      closeLabel={text('monetary.close')}
    >
      {review !== null && (
        <PayloadSummary
          payload={review.payload}
          company={company ?? undefined}
          configuration={state.configuration}
          code={code}
        />
      )}
      <Button onClick={confirm} disabled={submission.pending}>
        {text('monetary.confirm')}
      </Button>
      {submission.error !== null && <Alert tone="danger">{errorMessage(submission.error)}</Alert>}
    </Dialog>
  );
}
export { DirectiveReview };
