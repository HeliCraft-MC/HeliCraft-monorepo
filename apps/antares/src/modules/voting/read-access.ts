import { and, eq, or } from 'drizzle-orm';
import { legalSubjects, votingEligibleVoters } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { VotingInput } from './contracts';
import { currentShareholderParticipant } from '../companies/shareholder-access';
import { companyHolders } from '../companies/decision-authority';

async function personalVoter(
  transaction: Transaction,
  id: string,
  userId: string,
): Promise<boolean> {
  const rows = await transaction
    .select({ voterId: votingEligibleVoters.voterId })
    .from(votingEligibleVoters)
    .leftJoin(legalSubjects, eq(legalSubjects.id, votingEligibleVoters.subjectId))
    .where(
      and(
        eq(votingEligibleVoters.votingId, id),
        or(
          eq(votingEligibleVoters.userId, userId),
          and(eq(legalSubjects.kind, 'PLAYER'), eq(legalSubjects.playerId, userId)),
        ),
      ),
    );
  return rows.length > 0;
}
async function corporateVotingReader(
  transaction: Transaction,
  electorate: VotingInput['electorate'],
  userId: string,
): Promise<boolean> {
  if (!('companyId' in electorate)) {
    return false;
  }
  const holders = await companyHolders(transaction, electorate.companyId);
  return (
    holders.some((holder) => holder.userId === userId) ||
    (await currentShareholderParticipant(transaction, electorate.companyId, userId))
  );
}
export { personalVoter, corporateVotingReader };
