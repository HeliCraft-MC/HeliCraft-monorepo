import { useCallback } from 'react';
import type { ReactElement } from 'react';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { useFormationProject } from './use-formation-project';
import { CompanyFormationSummary } from './formation-summary';
import { useCompanyDecisionSubmission } from './use-decision-submission';
import { CompanyDecisionReview } from './decision-review';

function CompanyFoundingDecision({
  workspace,
  draftId,
  onSaved,
}: Readonly<{
  workspace: CompanyWorkspace;
  draftId?: string;
  onSaved: () => void;
}>): ReactElement | null {
  const { locale } = useTranslation();
  const project = useFormationProject(draftId);
  const submission = useCompanyDecisionSubmission(workspace, onSaved);
  const { propose } = submission;
  const review = useCallback((): void => {
    if (project.data !== undefined) {
      propose({
        kind: 'FOUND_COMPANY',
        companyId: project.data.draft.companyId,
        formationHash: project.data.draft.formationHash,
      });
    }
  }, [project.data, propose]);
  if (draftId === undefined) {
    return null;
  }
  const selected =
    project.data?.draft.configuration.allocations.some(
      (allocation) => allocation.owner.type === 'COMPANY' && allocation.owner.id === workspace.id,
    ) ?? false;
  return (
    <section>
      <h3>{uiText(locale, 'Согласие компании на учреждение', 'Corporate formation consent')}</h3>
      {project.data !== undefined && (
        <>
          <CompanyFormationSummary configuration={project.data.draft.configuration} />
          <a href={`/app/companies/drafts/${project.data.draft.id}`}>
            {uiText(locale, 'Вернуться к проекту', 'Return to formation draft')}
          </a>
          {selected && workspace.availableActions.includes('FOUND_COMPANY') && (
            <Button onClick={review} disabled={project.data.registered}>
              {uiText(
                locale,
                'Проверить согласие учредителя-компании',
                'Review founding company consent',
              )}
            </Button>
          )}
        </>
      )}
      {project.error !== null && <Alert tone="danger">{errorMessage(project.error)}</Alert>}
      <CompanyDecisionReview workspace={workspace} submission={submission} />
    </section>
  );
}
export { CompanyFoundingDecision };
