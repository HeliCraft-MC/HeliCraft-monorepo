import { useCallback } from 'react';
import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { economicAuthority } from '../taxation/model';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { EntityVotingForm } from './entity-voting-form';
import type { EntityBallot } from './entity-voting-form';
import { StateCompanyReview } from './state-review';

function StateEntityVoting({
  state,
  actorId,
  votingId,
  onSaved,
}: Readonly<{
  state: StateDetail;
  actorId: string;
  votingId?: string;
  onSaved: () => void;
}>): ReactElement | null {
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview } = submission;
  const review = useCallback(
    (payload: EntityBallot): void => {
      setReview({ idempotencyKey: crypto.randomUUID(), payload });
    },
    [setReview],
  );
  if (votingId === undefined || !economicAuthority(state, actorId, 'VOTE_AS_SHAREHOLDER')) {
    return null;
  }
  return (
    <>
      <EntityVotingForm key={votingId} ownerId={state.id} votingId={votingId} onReview={review} />
      <StateCompanyReview state={state} submission={submission} />
    </>
  );
}
export { StateEntityVoting };
