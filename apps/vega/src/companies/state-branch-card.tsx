// oxlint-disable import/max-dependencies -- State branch review combines actual company identity, preserved presence history and the existing immutable Governance workflow.
import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { StateDetail, CompanyBranchSummary } from '@helicraft/alhena';
import { Button, FormField, Select, Textarea } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { economicAuthority } from '../taxation/model';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { MonetaryCompany } from '../monetary/company';
import { CompanyBranchDetail } from './branch-detail';
import { StateCompanyReview } from './state-review';
import { companyStatusLabel } from './labels';

function StateCompanyBranchCard({
  state,
  branch,
  actorId,
  onSaved,
}: Readonly<{
  state: StateDetail;
  branch: CompanyBranchSummary;
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
        kind: 'REVIEW_COMPANY_BRANCH',
        branchId: branch.id,
        applicationId: branch.currentApplicationId,
        decision,
        reason,
      },
    });
  }, [branch.id, branch.currentApplicationId, decision, reason, setReview]);
  return (
    <article>
      <h3>{displayText(branch.name, locale)}</h3>
      <MonetaryCompany id={branch.companyId} />
      <p>{companyStatusLabel(branch.status, locale)}</p>
      <p>{displayText(branch.description, locale)}</p>
      <details>
        <summary>
          {uiText(locale, 'Условия и история присутствия', 'Presence terms and history')}
        </summary>
        <CompanyBranchDetail id={branch.id} />
      </details>
      {branch.status === 'PENDING_REGISTRATION' &&
        economicAuthority(state, actorId, 'REVIEW_COMPANY_BRANCH') && (
          <>
            <FormField
              label={uiText(locale, 'Решение по филиалу', 'Branch decision')}
              htmlFor={`${id}-decision`}
            >
              <Select id={`${id}-decision`} value={decision} onChange={choose}>
                <option value="APPROVE">{uiText(locale, 'Одобрить', 'Approve')}</option>
                <option value="REJECT">{uiText(locale, 'Отклонить', 'Reject')}</option>
              </Select>
            </FormField>
            <FormField
              label={uiText(locale, 'Основание по филиалу', 'Branch decision reason')}
              htmlFor={`${id}-reason`}
            >
              <Textarea id={`${id}-reason`} value={reason} onChange={explain} maxLength={2000} />
            </FormField>
            <Button onClick={review} disabled={reason.trim() === ''}>
              {uiText(locale, 'Проверить решение по филиалу', 'Review branch decision')}
            </Button>
          </>
        )}
      <StateCompanyReview state={state} submission={submission} />
    </article>
  );
}
export { StateCompanyBranchCard };
