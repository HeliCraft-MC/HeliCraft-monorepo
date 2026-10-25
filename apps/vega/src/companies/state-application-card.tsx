import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { StateDetail, CompanyRegistrationApplication } from '@helicraft/alhena';
import { Button, FormField, Select, Textarea, Alert } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { economicAuthority } from '../taxation/model';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { CompanyFormationSummary } from './formation-summary';
import { StateCompanyReview } from './state-review';
import { companyStatusLabel } from './labels';

function StateCompanyApplicationCard({
  state,
  application,
  actorId,
  onSaved,
}: Readonly<{
  state: StateDetail;
  application: CompanyRegistrationApplication;
  actorId: string;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reason, setReason] = useState('');
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview } = submission;
  const choose = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    const next = event.currentTarget.value;
    if (next === 'APPROVE' || next === 'REJECT') {
      setDecision(next);
    }
  }, []);
  const explain = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    setReason(event.currentTarget.value);
  }, []);
  const review = useCallback((): void => {
    setReview({
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'REVIEW_COMPANY_REGISTRATION',
        applicationId: application.id,
        formationHash: application.formationHash,
        decision,
        reason,
      },
    });
  }, [application.id, application.formationHash, decision, reason, setReview]);
  return (
    <article>
      <h3>{displayText(application.configuration.name, locale)}</h3>
      <p>{companyStatusLabel(application.status, locale)}</p>
      <a href={`/app/companies/applications/${application.id}`}>
        {uiText(locale, 'Открыть заявку', 'Open application')}
      </a>
      <details>
        <summary>
          {uiText(locale, 'Неизменяемые условия учреждения', 'Immutable formation terms')}
        </summary>
        <CompanyFormationSummary
          configuration={application.configuration}
          companyId={application.companyId}
          applicationId={application.id}
        />
      </details>
      {application.pendingReviewDirectiveId !== null &&
        application.pendingReviewDirectiveId !== undefined && (
          <Alert>
            <a href={`/app/state-decisions/${application.pendingReviewDirectiveId}`}>
              {uiText(
                locale,
                'Решение уже подготовлено. Открыть одобрения и исполнение',
                'A decision is already prepared. Open approvals and execution',
              )}
            </a>
          </Alert>
        )}
      {application.status === 'PENDING' &&
        (application.pendingReviewDirectiveId === null ||
          application.pendingReviewDirectiveId === undefined) &&
        economicAuthority(state, actorId, 'REVIEW_COMPANY_REGISTRATION') && (
          <>
            <FormField
              label={uiText(locale, 'Решение по заявке', 'Application decision')}
              htmlFor={`${id}-decision`}
            >
              <Select id={`${id}-decision`} value={decision} onChange={choose}>
                <option value="APPROVE">{uiText(locale, 'Одобрить', 'Approve')}</option>
                <option value="REJECT">{uiText(locale, 'Отклонить', 'Reject')}</option>
              </Select>
            </FormField>
            <FormField
              label={uiText(locale, 'Обоснование решения', 'Decision reason')}
              htmlFor={`${id}-reason`}
            >
              <Textarea
                id={`${id}-reason`}
                value={reason}
                onChange={explain}
                maxLength={2000}
                required
                aria-describedby={`${id}-reason-hint`}
              />
              <p id={`${id}-reason-hint`}>
                {uiText(
                  locale,
                  'Укажите причину: она сохранится в истории заявки. Затем проверьте и создайте решение.',
                  'Enter a reason for the application history, then review and create the decision.',
                )}
              </p>
            </FormField>
            <Button onClick={review} disabled={reason.trim() === ''}>
              {uiText(locale, 'Проверить решение по заявке', 'Review application decision')}
            </Button>
          </>
        )}
      <StateCompanyReview state={state} submission={submission} />
    </article>
  );
}
export { StateCompanyApplicationCard };
