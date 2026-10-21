import type { ReactElement } from 'react';
import type { CompanyDecisionPayload } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';
import { CompanyStateIdentity } from './state-identity';
import { CompanyFormationReference } from './formation-reference';
import { CompanyBallotSummary } from './ballot-summary';
import { companyActionLabel } from './labels';

type RelatedDecision = Extract<
  CompanyDecisionPayload,
  {
    kind:
      | 'REGISTER_BRANCH'
      | 'CLOSE_BRANCH'
      | 'CLOSE_COMPANY'
      | 'FOUND_COMPANY'
      | 'VOTE_AS_SHAREHOLDER'
      | 'REVOKE_SHARE_ACQUISITION';
  }
>;
function CompanyRelatedDecisionSummary({
  payload,
}: Readonly<{ payload: RelatedDecision }>): ReactElement {
  const { locale } = useTranslation();
  if (payload.kind === 'REGISTER_BRANCH') {
    return (
      <section>
        <h3>{displayText(payload.name, locale)}</h3>
        <CompanyStateIdentity id={payload.stateId} />
        <p>{displayText(payload.description, locale)}</p>
      </section>
    );
  }
  if (payload.kind === 'CLOSE_BRANCH' || payload.kind === 'CLOSE_COMPANY') {
    return <p>{payload.reason}</p>;
  }
  if (payload.kind === 'FOUND_COMPANY') {
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
  return <p>{companyActionLabel(payload.kind, locale)}</p>;
}
export { CompanyRelatedDecisionSummary };
