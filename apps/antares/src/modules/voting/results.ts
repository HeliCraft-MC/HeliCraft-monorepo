import { eq } from 'drizzle-orm';
import {
  votingBallots,
  votingBallotChoices,
  votingOptions,
  votingEligibleVoters,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { VotingInput, VotingResult } from './contracts';
import { calculateResult } from './domain';

async function storedVotingResult(
  transaction: Transaction,
  id: string,
  input: VotingInput,
): Promise<VotingResult> {
  const electorate = await transaction
    .select()
    .from(votingEligibleVoters)
    .where(eq(votingEligibleVoters.votingId, id));
  const ballots = await transaction
    .select()
    .from(votingBallots)
    .where(eq(votingBallots.votingId, id));
  const choices = await transaction
    .select({ ballotId: votingBallotChoices.ballotId, optionKey: votingOptions.optionKey })
    .from(votingBallotChoices)
    .innerJoin(votingOptions, eq(votingOptions.id, votingBallotChoices.optionId))
    .where(eq(votingOptions.votingId, id));
  return calculateResult(
    input,
    {
      count: electorate.length,
      weight: electorate.reduce((sum, voter) => sum + BigInt(voter.weight), 0n).toString(),
    },
    ballots.map((ballot) => {
      const voter = electorate.find((candidate) => candidate.voterId === ballot.voterId);
      if (!voter) {
        throw new Error('Ballot has no frozen voting weight');
      }
      return {
        weight: voter.weight,
        abstain: ballot.abstain,
        choices: choices
          .filter((choice) => choice.ballotId === ballot.id)
          .map((choice) => choice.optionKey),
      };
    }),
  );
}
export { storedVotingResult };
