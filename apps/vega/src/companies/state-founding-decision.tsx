// oxlint-disable import/max-dependencies -- Founding state consent combines protected formation terms with the existing immutable state Governance review.
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { economicAuthority } from '../taxation/model';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { useFormationProject } from './use-formation-project';
import { CompanyFormationSummary } from './formation-summary';
import { StateCompanyReview } from './state-review';

function StateCompanyFoundingDecision({
  state,
  actorId,
  draftId,
  onSaved,
}: Readonly<{
  state: StateDetail;
  actorId: string;
  draftId?: string;
  onSaved: () => void;
}>): ReactElement | null {
  const { locale } = useTranslation();
  const project = useFormationProject(draftId);
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview } = submission;
  const review = useCallback((): void => {
    if (project.data !== undefined) {
      setReview({
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'CONSENT_COMPANY_FORMATION',
          companyId: project.data.draft.companyId,
          formationHash: project.data.draft.formationHash,
        },
      });
    }
  }, [project.data, setReview]);
  if (draftId === undefined) {
    return null;
  }
  const selected =
    project.data?.draft.configuration.allocations.some(
      (allocation) => allocation.owner.type === 'STATE' && allocation.owner.id === state.id,
    ) ?? false;
  return (
    <section>
      <h2>{uiText(locale, 'Согласие государства на учреждение', 'State formation consent')}</h2>
      {project.data !== undefined && (
        <>
          <CompanyFormationSummary
            configuration={project.data.draft.configuration}
            companyId={project.data.draft.companyId}
          />
          <a href={`/app/companies/drafts/${project.data.draft.id}`}>
            {uiText(locale, 'Вернуться к проекту', 'Return to formation draft')}
          </a>
          {selected && economicAuthority(state, actorId, 'CONSENT_COMPANY_FORMATION') && (
            <Button onClick={review} disabled={project.data.registered}>
              {uiText(
                locale,
                'Проверить согласие государства-учредителя',
                'Review founding state consent',
              )}
            </Button>
          )}
        </>
      )}
      {project.error !== null && <Alert tone="danger">{errorMessage(project.error)}</Alert>}
      <StateCompanyReview state={state} submission={submission} />
    </section>
  );
}
export { StateCompanyFoundingDecision };
