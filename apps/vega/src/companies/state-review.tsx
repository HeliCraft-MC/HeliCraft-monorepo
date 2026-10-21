import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { PayloadSummary } from '../monetary/payload-summary';
import type { useDirectiveSubmission } from '../monetary/use-directive-submission';

function StateCompanyReview({
  submission,
  state,
}: Readonly<{
  submission: ReturnType<typeof useDirectiveSubmission>;
  state: StateDetail;
}>): ReactElement {
  const { locale } = useTranslation();
  const { review, confirm, changeOpen } = submission;
  return (
    <>
      <Dialog
        open={review !== null}
        onOpenChange={changeOpen}
        title={uiText(locale, 'Проверьте государственное решение', 'Review state decision')}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        {review !== null && (
          <PayloadSummary payload={review.payload} configuration={state.configuration} code="" />
        )}
        <Button onClick={confirm} disabled={submission.pending}>
          {uiText(locale, 'Предложить государственное решение', 'Propose state decision')}
        </Button>
        {submission.error !== null && <Alert tone="danger">{errorMessage(submission.error)}</Alert>}
      </Dialog>
      {submission.savedId !== null && (
        <Alert tone="success">
          {uiText(
            locale,
            'Решение сохранено. Одобрения и исполнение доступны ниже.',
            'Decision saved. Approvals and outcome are shown below.',
          )}
        </Alert>
      )}
    </>
  );
}
export { StateCompanyReview };
