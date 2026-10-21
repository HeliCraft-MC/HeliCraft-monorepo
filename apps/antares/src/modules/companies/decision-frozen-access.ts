import { eq } from 'drizzle-orm';
import { companyDecisionVotes, votingEligibleVoters, legalSubjects } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { CompanyDecisionRecord } from './decision-store';
import { legalEntityVotingParticipant } from './shareholder-access';

async function frozenCreatorShareholder(
  transaction: Transaction,
  record: CompanyDecisionRecord,
): Promise<boolean> {
  const positions = await transaction
    .select({ subject: legalSubjects })
    .from(companyDecisionVotes)
    .innerJoin(
      votingEligibleVoters,
      eq(votingEligibleVoters.votingId, companyDecisionVotes.votingId),
    )
    .innerJoin(legalSubjects, eq(legalSubjects.id, votingEligibleVoters.subjectId))
    .where(eq(companyDecisionVotes.decisionId, record.id));
  for (const { subject } of positions) {
    if (subject.kind === 'PLAYER' && subject.playerId === record.createdBy) {
      return true;
    }
    if (subject.kind !== 'PLAYER') {
      // oxlint-disable-next-line no-await-in-loop -- Frozen legal shareholders retain proposal continuity only through their own current Governance on the same transaction connection.
      const allowed = await legalEntityVotingParticipant(
        transaction,
        { type: subject.kind, id: subject.id },
        record.createdBy,
      );
      if (allowed) {
        return true;
      }
    }
  }
  return false;
}
export { frozenCreatorShareholder };
