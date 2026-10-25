import { eq } from 'drizzle-orm';
import { votings, adminAuditLog } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { VotingInput, VotingResult } from './contracts';
import { storedVotingResult } from './results';
import { approvedWeight } from './weights';

type CompletionReason = 'ALL_VOTED' | 'DECIDED';
function votingCompletion(
  input: Readonly<VotingInput>,
  result: NonNullable<VotingResult>,
): CompletionReason | null {
  if (input.survey || result.eligible === 0) {
    return null;
  }
  if (result.participating === result.eligible) {
    return 'ALL_VOTED';
  }
  if (input.rules.closeWhenDecided !== true || !result.quorumMet || !result.weights) {
    return null;
  }
  const eligible = BigInt(result.weights.eligible);
  const participating = BigInt(result.weights.participating);
  const remaining = eligible - participating;
  const decisive = participating - BigInt(result.weights.abstentions);
  const fixed = result.weights.options.every((option) => {
    const votes = BigInt(option.weight);
    const minimum = approvedWeight(input.rules, {
      votes,
      decisive: decisive + remaining,
      eligible,
    });
    const maximum = approvedWeight(input.rules, {
      votes: votes + remaining,
      decisive: decisive + remaining,
      eligible,
    });
    return minimum === maximum;
  });
  return fixed ? 'DECIDED' : null;
}
async function closeCompletedVoting(
  transaction: Transaction,
  record: typeof votings.$inferSelect,
): Promise<typeof votings.$inferSelect> {
  if (record.status !== 'OPEN' || record.configuration.survey) {
    return record;
  }
  const result = await storedVotingResult(transaction, record.id, record.configuration);
  const reason = result === null ? null : votingCompletion(record.configuration, result);
  if (reason === null) {
    return record;
  }
  await transaction.update(votings).set({ status: 'CLOSED' }).where(eq(votings.id, record.id));
  await transaction.insert(adminAuditLog).values({
    actorId: record.createdBy,
    targetId: record.id,
    targetType: 'VOTING',
    action: `voting.closed_early.${reason.toLowerCase()}`,
  });
  return { ...record, status: 'CLOSED' };
}
export { votingCompletion, closeCompletedVoting, type CompletionReason };
