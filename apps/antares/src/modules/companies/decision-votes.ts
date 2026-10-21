// oxlint-disable no-await-in-loop -- Each immutable vote requirement is created or evaluated on one ordered evidence transaction.
import { eq } from 'drizzle-orm';
import { companyDecisionVotes } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryHash } from '../monetary/domain';
import { persistVoting, publishVoting, lockedVoting, advance } from '../voting/persistence';
import { storedVotingResult } from '../voting/results';
import type { CompanyDecisionRecord } from './decision-store';
import type { decisionRequirements } from './decision-authority';

const HOUR_MS = 3_600_000;
type Requirements = ReturnType<typeof decisionRequirements>;
interface CompanyVoteEvidence {
  readonly id: string;
  readonly requirementHash: string;
  readonly approved: boolean;
}
async function createCompanyVotes(
  transaction: Transaction,
  record: CompanyDecisionRecord,
  requirements: Requirements,
): Promise<void> {
  for (const requirement of requirements.votes) {
    const yes = crypto.randomUUID();
    const votingId = await persistVoting(transaction, record.createdBy, {
      title: { en: 'Corporate decision', ru: 'Корпоративное решение' },
      description: {
        en: `Immutable corporate decision ${record.id}. Review its exact terms before voting.`,
        ru: `Неизменяемое корпоративное решение ${record.id}. Перед голосованием проверьте точные условия.`,
      },
      options: [
        { id: yes, label: { en: 'Approve', ru: 'Одобрить' } },
        { id: crypto.randomUUID(), label: { en: 'Reject', ru: 'Отклонить' } },
      ],
      opensAt: record.createdAt.toISOString(),
      closesAt: new Date(
        record.createdAt.getTime() + requirement.rules.durationHours * HOUR_MS,
      ).toISOString(),
      electorate: requirement.electorate,
      rules: requirement.rules,
      maxSelections: 1,
      resultVisibility: 'ELIGIBLE_ONLY',
    });
    await transaction.insert(companyDecisionVotes).values({
      decisionId: record.id,
      requirementHash: monetaryHash(requirement),
      votingId,
      approvalOptionId: yes,
    });
    await publishVoting(transaction, votingId, {
      subject: { type: 'COMPANY_DECISION', id: record.id, version: 1 },
      companyRevisionId: record.revisionId,
    });
  }
}
async function companyVotes(
  transaction: Transaction,
  record: CompanyDecisionRecord,
  requirements: Requirements,
): Promise<CompanyVoteEvidence[]> {
  const links = await transaction
    .select()
    .from(companyDecisionVotes)
    .where(eq(companyDecisionVotes.decisionId, record.id));
  const evidence: CompanyVoteEvidence[] = [];
  for (const link of links) {
    const voting = await advance(
      transaction,
      await lockedVoting(transaction, link.votingId),
      new Date(),
    );
    const requirement = requirements.votes.find(
      (candidate) => monetaryHash(candidate) === link.requirementHash,
    );
    const bound =
      requirement !== undefined &&
      voting.subject?.type === 'COMPANY_DECISION' &&
      voting.subject.id === record.id &&
      voting.subject.version === 1 &&
      voting.companyRevisionId === record.revisionId &&
      voting.governanceRevisionId === null &&
      monetaryHash({
        electorate: voting.configuration.electorate,
        rules: voting.configuration.rules,
      }) === link.requirementHash;
    const result =
      bound && voting.status === 'CLOSED'
        ? await storedVotingResult(transaction, voting.id, voting.configuration)
        : null;
    evidence.push({
      id: voting.id,
      requirementHash: link.requirementHash,
      approved:
        result?.options.some((option) => option.id === link.approvalOptionId && option.approved) ===
        true,
    });
  }
  return evidence;
}
export { createCompanyVotes, companyVotes, type CompanyVoteEvidence };
