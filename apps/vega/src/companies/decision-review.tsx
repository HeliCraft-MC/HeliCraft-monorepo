import type { ReactElement } from 'react';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { TaxBreakdown } from '../taxation/breakdown';
import { useExpired } from '../use-expired';
import { CompanyDecisionPayloadSummary } from './decision-payload-summary';
import type { useCompanyDecisionSubmission } from './use-decision-submission';

function CompanyDecisionReview({
  workspace,
  submission,
  code = '',
}: Readonly<{
  workspace: CompanyWorkspace;
  submission: ReturnType<typeof useCompanyDecisionSubmission>;
  code?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  const { review, confirm, changeOpen } = submission;
  const expired = useExpired(review?.expiresAt);
  return (
    <>
      <Dialog
        open={review !== null}
        onOpenChange={changeOpen}
        title={uiText(locale, 'Проверьте корпоративное решение', 'Review corporate decision')}
        description={uiText(
          locale,
          'Решение закрепляет точные условия и действующий устав. Исполнение зависит от требуемых одобрений и голосований.',
          'The decision pins these exact terms and the current charter. Execution requires the configured approvals and votes.',
        )}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        {review !== null && (
          <>
            <CompanyDecisionPayloadSummary
              payload={review.payload}
              charter={workspace.content.charter}
            />
            {review.expiresAt !== undefined && (
              <p>
                {uiText(locale, 'Расчёт до', 'Quote valid until')}:{' '}
                <time dateTime={review.expiresAt}>
                  {new Date(review.expiresAt).toLocaleTimeString(locale)}
                </time>
              </p>
            )}
            {expired && (
              <Alert tone="danger">
                {uiText(
                  locale,
                  'Срок расчёта истёк. Закройте окно и получите новый расчёт.',
                  'The quote expired. Close this dialog and request a new quote.',
                )}
              </Alert>
            )}
            {review.calculation !== undefined && (
              <TaxBreakdown calculation={review.calculation} code={code} />
            )}
          </>
        )}
        <Button onClick={confirm} disabled={submission.pending || expired}>
          {uiText(locale, 'Предложить корпоративное решение', 'Propose corporate decision')}
        </Button>
        {submission.error !== null && <Alert tone="danger">{errorMessage(submission.error)}</Alert>}
      </Dialog>
      {submission.savedId !== null && (
        <Alert tone="success">
          <a href={`/app/company-decisions/${submission.savedId}`}>
            {uiText(
              locale,
              'Решение сохранено. Открыть одобрения и результат',
              'Decision saved. View approvals and outcome',
            )}
          </a>
        </Alert>
      )}
    </>
  );
}
export { CompanyDecisionReview };
