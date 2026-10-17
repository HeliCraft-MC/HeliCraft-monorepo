import { MonetaryVotingPayload } from '../monetary/voting-payload';
import type { ReactElement } from 'react';
import type { VotingDetail } from '@helicraft/alhena';
import { ReformProposal } from './reform-proposal';
import { OfficeAssignmentVoteDetails } from './office-assignment-vote-details';

function VotingSubjectDetails({
  subject,
  votingId,
}: Readonly<{ subject: VotingDetail['subject']; votingId: string }>): ReactElement | null {
  if (subject?.type === 'MONETARY_DIRECTIVE') {
    return <MonetaryVotingPayload id={votingId} />;
  }
  if (subject?.type === 'STATE_REFORM') {
    return <ReformProposal votingId={votingId} />;
  }
  if (subject?.type === 'STATE_OFFICE_ASSIGNMENT') {
    return <OfficeAssignmentVoteDetails id={subject.id} />;
  }
  return null;
}
export { VotingSubjectDetails };
