import { eq } from 'drizzle-orm';
import { monetaryVotes } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { actionName } from '../states/constitution-language';
import type { StateDetail, Policy } from '../states/contracts';
import { policyRequirements } from '../states/office-assignment-domain';
import { lockedVoting, advance, persistVoting, publishVoting } from '../voting/persistence';
import { storedVotingResult } from '../voting/results';
import type { DirectiveRecord } from './store';
import { DECISION_ACTIONS } from './domain';

const HOUR_MS = 3_600_000;
async function createDirectiveVote(
  transaction: Transaction,
  input: Readonly<{ record: DirectiveRecord; state: StateDetail; policy: Policy }>,
): Promise<void> {
  const { record, state, policy } = input;
  const [requirement] = policyRequirements(
    policy,
    state.id,
    state.configuration.governance.votingDefaults,
  ).votes;
  if (!requirement) {
    return;
  }
  const yes = crypto.randomUUID();
  const territorial = record.payload.kind === 'CHANGE_TERRITORY';
  const id = await persistVoting(transaction, record.createdBy, {
    title: {
      ru: `${territorial ? 'Территориальное' : 'Денежное'} решение: ${actionName(DECISION_ACTIONS[record.payload.kind], 'ru')}`,
      en: `${territorial ? 'Territorial' : 'Monetary'} decision: ${actionName(DECISION_ACTIONS[record.payload.kind], 'en')}`,
    },
    description: {
      ru: territorial
        ? `Неизменяемая территориальная заявка ${record.id}. Проверьте геометрию и обоснование. После государственного решения требуется административная ратификация.`
        : `Неизменяемое распоряжение ${record.id}. Проверьте сумму, получателя и ограничения в полном тексте решения.`,
      en: territorial
        ? `Immutable territorial proposal ${record.id}. Review its geometry and justification. Administrative ratification follows the state decision.`
        : `Immutable directive ${record.id}. Review the amount, recipient and limits in the complete decision.`,
    },
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
    resultVisibility: 'ELIGIBLE_ONLY',
  });
  await publishVoting(transaction, id, {
    subject: { type: 'MONETARY_DIRECTIVE', id: record.id, version: 1 },
    governanceRevisionId: record.governanceRevisionId,
  });
  await transaction
    .insert(monetaryVotes)
    .values({ directiveId: record.id, votingId: id, approvalOptionId: yes });
}
async function directiveVotes(
  transaction: Transaction,
  record: DirectiveRecord,
): Promise<{ id: string; approved: boolean }[]> {
  const [link] = await transaction
    .select()
    .from(monetaryVotes)
    .where(eq(monetaryVotes.directiveId, record.id));
  if (!link) {
    return [];
  }
  const voting = await advance(
    transaction,
    await lockedVoting(transaction, link.votingId),
    new Date(),
  );
  const bound =
    voting.subject?.type === 'MONETARY_DIRECTIVE' &&
    voting.subject.id === record.id &&
    voting.subject.version === 1 &&
    voting.governanceRevisionId === record.governanceRevisionId;
  const result =
    bound && voting.status === 'CLOSED'
      ? await storedVotingResult(transaction, voting.id, voting.configuration)
      : null;
  return [
    {
      id: voting.id,
      approved:
        result?.options.some((option) => option.id === link.approvalOptionId && option.approved) ===
        true,
    },
  ];
}
export { createDirectiveVote, directiveVotes };
