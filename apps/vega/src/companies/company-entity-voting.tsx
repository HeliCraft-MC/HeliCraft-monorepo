import type { ReactElement } from 'react';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { EntityVotingForm } from './entity-voting-form';
import { useCompanyDecisionSubmission } from './use-decision-submission';
import { CompanyDecisionReview } from './decision-review';

function CompanyEntityVoting({
  workspace,
  votingId,
  onSaved,
}: Readonly<{
  workspace: CompanyWorkspace;
  votingId?: string;
  onSaved: () => void;
}>): ReactElement | null {
  const submission = useCompanyDecisionSubmission(workspace, onSaved);
  const { propose: handleReview } = submission;
  if (votingId === undefined || !workspace.availableActions.includes('VOTE_AS_SHAREHOLDER')) {
    return null;
  }
  return (
    <>
      <EntityVotingForm
        key={votingId}
        ownerId={workspace.id}
        votingId={votingId}
        onReview={handleReview}
      />
      <CompanyDecisionReview workspace={workspace} submission={submission} />
    </>
  );
}
export { CompanyEntityVoting };
