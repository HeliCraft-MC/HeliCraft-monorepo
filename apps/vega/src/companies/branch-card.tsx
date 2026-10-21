// oxlint-disable import/max-dependencies -- Branch lifecycle composition combines immutable application history, resubmission and charter-approved closure.
import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyWorkspace, CompanyBranchSummary } from '@helicraft/alhena';
import { Button, FormField, Textarea } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyStateIdentity } from './state-identity';
import { companyStatusLabel } from './labels';
import { CompanyBranchComposer } from './branch-composer';
import { CompanyBranchDetail } from './branch-detail';
import { useCompanyDecisionSubmission } from './use-decision-submission';
import { CompanyDecisionReview } from './decision-review';

function CompanyBranchCard({
  workspace,
  branch,
  onSaved,
}: Readonly<{
  workspace: CompanyWorkspace;
  branch: CompanyBranchSummary;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [reason, setReason] = useState('');
  const submission = useCompanyDecisionSubmission(workspace, onSaved);
  const { propose } = submission;
  const changeReason = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    setReason(event.currentTarget.value);
  }, []);
  const close = useCallback((): void => {
    propose({ kind: 'CLOSE_BRANCH', branchId: branch.id, reason });
  }, [branch.id, reason, propose]);
  return (
    <article>
      <h3>{displayText(branch.name, locale)}</h3>
      <CompanyStateIdentity id={branch.stateId} />
      <p>{companyStatusLabel(branch.status, locale)}</p>
      <p>{displayText(branch.description, locale)}</p>
      <details>
        <summary>
          {uiText(locale, 'Заявка и история филиала', 'Branch application and history')}
        </summary>
        <CompanyBranchDetail id={branch.id} />
      </details>
      {['REJECTED', 'PENDING_REGISTRATION'].includes(branch.status) &&
        workspace.availableActions.includes('REGISTER_BRANCH') && (
          <details>
            <summary>{uiText(locale, 'Исправить заявку', 'Revise branch application')}</summary>
            <CompanyBranchComposer workspace={workspace} branch={branch} onSaved={onSaved} />
          </details>
        )}
      {branch.status !== 'CLOSED' && workspace.availableActions.includes('CLOSE_BRANCH') && (
        <details>
          <summary>{uiText(locale, 'Закрыть присутствие', 'Close branch presence')}</summary>
          <FormField
            label={uiText(locale, 'Причина закрытия филиала', 'Branch closure reason')}
            htmlFor={id}
          >
            <Textarea id={id} value={reason} onChange={changeReason} maxLength={2000} />
          </FormField>
          <Button onClick={close} disabled={reason.trim() === ''}>
            {uiText(locale, 'Проверить закрытие филиала', 'Review branch closure')}
          </Button>
        </details>
      )}
      <CompanyDecisionReview workspace={workspace} submission={submission} />
    </article>
  );
}
export { CompanyBranchCard };
