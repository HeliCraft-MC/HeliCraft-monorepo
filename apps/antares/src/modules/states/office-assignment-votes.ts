// oxlint-disable no-await-in-loop -- Generic voting creation and lifecycle reads share the state-decision transaction.
import { eq } from 'drizzle-orm';
import { stateOfficeAssignmentVotes } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import {
  LocalizedInputSchema,
  SUPPORTED_LOCALES,
  resolveText,
} from '../localized-content/contracts';
import { persistVoting, publishVoting, lockedVoting, advance } from '../voting/persistence';
import { storedVotingResult } from '../voting/results';
import type { AssignmentRecord } from './office-assignment-context';
import type { Office } from './contracts';
import type { AssignmentVote } from './office-assignment-domain';

const HOUR_MS = 3_600_000;
function assignmentVoteText(
  record: AssignmentRecord,
  office: Office,
  personName: string,
): {
  title: ReturnType<typeof LocalizedInputSchema.parse>;
  description: ReturnType<typeof LocalizedInputSchema.parse>;
} {
  const title = LocalizedInputSchema.parse(
    Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => [
        locale,
        `${locale === 'ru' ? 'Решение о должности' : 'Office decision'}: ${personName} — ${resolveText(office.name, locale).value}`,
      ]),
    ),
  );
  const description = LocalizedInputSchema.parse({
    ru:
      record.kind === 'APPOINT'
        ? 'Назначить указанного гражданина на должность. Полное предложение доступно ниже.'
        : 'Снять указанного игрока с должности. Полное предложение доступно ниже.',
    en:
      record.kind === 'APPOINT'
        ? 'Appoint the specified citizen to this office. Review the complete proposal below.'
        : 'Remove the specified player from this office. Review the complete proposal below.',
  });
  return { title, description };
}
async function createAssignmentVotes(
  transaction: Transaction,
  input: Readonly<{
    record: AssignmentRecord;
    office: Office;
    personName: string;
    requirements: readonly AssignmentVote[];
  }>,
): Promise<void> {
  const { record, office, personName, requirements } = input;
  const { title, description } = assignmentVoteText(record, office, personName);
  for (const requirement of requirements) {
    const yes = crypto.randomUUID();
    const id = await persistVoting(transaction, record.createdBy, {
      title,
      description,
      options: [
        { id: yes, label: { ru: 'Одобрить', en: 'Approve' } },
        { id: crypto.randomUUID(), label: { ru: 'Отклонить', en: 'Reject' } },
      ],
      opensAt: record.createdAt.toISOString(),
      closesAt: new Date(
        record.createdAt.getTime() + requirement.rules.durationHours * HOUR_MS,
      ).toISOString(),
      electorate: requirement.electorate,
      rules: requirement.rules,
      maxSelections: 1,
      resultVisibility: 'PUBLIC',
    });
    await publishVoting(transaction, id, {
      subject: { type: 'STATE_OFFICE_ASSIGNMENT', id: record.id, version: 1 },
      governanceRevisionId: record.governanceRevisionId,
    });
    await transaction.insert(stateOfficeAssignmentVotes).values({
      assignmentId: record.id,
      source: requirement.source,
      votingId: id,
      approvalOptionId: yes,
    });
  }
}
async function assignmentVotes(
  transaction: Transaction,
  record: AssignmentRecord,
): Promise<{ id: string; source: 'OFFICE' | 'POLICY' | 'REMOVAL_POLICY'; approved: boolean }[]> {
  const links = await transaction
    .select()
    .from(stateOfficeAssignmentVotes)
    .where(eq(stateOfficeAssignmentVotes.assignmentId, record.id));
  const votes: { id: string; source: 'OFFICE' | 'POLICY' | 'REMOVAL_POLICY'; approved: boolean }[] =
    [];
  for (const link of links) {
    const voting = await advance(
      transaction,
      await lockedVoting(transaction, link.votingId),
      new Date(),
    );
    const bound =
      voting.subject?.type === 'STATE_OFFICE_ASSIGNMENT' &&
      voting.subject.id === record.id &&
      voting.subject.version === 1 &&
      voting.governanceRevisionId === record.governanceRevisionId;
    const result =
      bound && voting.status === 'CLOSED'
        ? await storedVotingResult(transaction, voting.id, voting.configuration)
        : null;
    votes.push({
      id: voting.id,
      source: link.source,
      approved:
        result?.options.some((option) => option.id === link.approvalOptionId && option.approved) ===
        true,
    });
  }
  return votes;
}
export { createAssignmentVotes, assignmentVotes };
