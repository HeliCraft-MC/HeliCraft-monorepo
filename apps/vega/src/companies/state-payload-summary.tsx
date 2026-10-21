import type { ReactElement } from 'react';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { PolicyTerms } from './policy-terms';
import { CompanyApplicationSummary } from './application-summary';
import { CompanyBranchReviewSummary } from './branch-review-summary';
import { CompanyFormationReference } from './formation-reference';
import { CompanyBallotSummary } from './ballot-summary';
import { ShareOperationSummary } from './share-operation-summary';
import type { CompanyStatePayload } from './state-model';

function CompanyStatePayloadSummary({
  payload,
}: Readonly<{ payload: CompanyStatePayload }>): ReactElement {
  const { locale } = useTranslation();
  if (payload.kind === 'SET_COMPANY_REGISTRATION_POLICY') {
    return <PolicyTerms policy={payload.policy} />;
  }
  if (payload.kind === 'REVIEW_COMPANY_REGISTRATION') {
    return (
      <section>
        <p>
          {payload.decision === 'APPROVE'
            ? uiText(locale, 'Одобрить регистрацию', 'Approve registration')
            : uiText(locale, 'Отклонить регистрацию', 'Reject registration')}
        </p>
        <CompanyApplicationSummary id={payload.applicationId} />
        <p>{payload.reason}</p>
      </section>
    );
  }
  if (payload.kind === 'REVIEW_COMPANY_BRANCH') {
    return (
      <section>
        <p>
          {payload.decision === 'APPROVE'
            ? uiText(locale, 'Одобрить филиал', 'Approve branch')
            : uiText(locale, 'Отклонить филиал', 'Reject branch')}
        </p>
        <CompanyBranchReviewSummary
          branchId={payload.branchId}
          applicationId={payload.applicationId}
        />
        <p>{payload.reason}</p>
      </section>
    );
  }
  if (payload.kind === 'CONSENT_COMPANY_FORMATION') {
    return (
      <CompanyFormationReference
        companyId={payload.companyId}
        formationHash={payload.formationHash}
      />
    );
  }
  if (payload.kind === 'VOTE_AS_SHAREHOLDER') {
    return <CompanyBallotSummary payload={payload} />;
  }
  if ('operation' in payload) {
    return <ShareOperationSummary operation={payload.operation} />;
  }
  return (
    <p>
      {uiText(
        locale,
        'Отзыв ранее выданного согласия на приобретение акций',
        'Revoke the previously granted share acquisition consent',
      )}
    </p>
  );
}
export { CompanyStatePayloadSummary };
