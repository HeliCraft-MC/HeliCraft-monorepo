import { and, eq } from 'drizzle-orm';
import { legalSubjects, votingEligibleVoters, votingBallots } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { legalEntityVotingParticipant } from '../companies/shareholder-access';
import type { VotingDetail } from './contracts';

async function entityVotingParticipants(
  transaction: Transaction,
  id: string,
  actorId: string,
): Promise<NonNullable<VotingDetail['entityVoters']>> {
  const voters = await transaction
    .select({
      subject: legalSubjects,
      weight: votingEligibleVoters.weight,
      ballotId: votingBallots.id,
    })
    .from(votingEligibleVoters)
    .innerJoin(legalSubjects, eq(legalSubjects.id, votingEligibleVoters.subjectId))
    .leftJoin(
      votingBallots,
      and(
        eq(votingBallots.votingId, votingEligibleVoters.votingId),
        eq(votingBallots.voterId, votingEligibleVoters.voterId),
      ),
    )
    .where(eq(votingEligibleVoters.votingId, id));
  const result: NonNullable<VotingDetail['entityVoters']> = [];
  for (const { subject, weight, ballotId } of voters) {
    if (subject.kind !== 'PLAYER') {
      const owner = { type: subject.kind, id: subject.id };
      // oxlint-disable-next-line no-await-in-loop -- Frozen legal voters are checked through their current Governance on the same transaction connection.
      if (await legalEntityVotingParticipant(transaction, owner, actorId)) {
        result.push({ owner, weight, hasVoted: ballotId !== null });
      }
    }
  }
  return result;
}
export { entityVotingParticipants };
