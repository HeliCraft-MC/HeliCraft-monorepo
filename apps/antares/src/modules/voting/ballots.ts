import { and, eq } from 'drizzle-orm';
import type { votings } from '../../db/schema';
import type { Database } from '../../db';
import {
  votingBallots,
  votingBallotChoices,
  votingOptions,
  votingEligibleVoters,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assertElectorateAvailable } from './eligibility';
import { lockedVoting, advance } from './persistence';
import { validateBallot } from './domain';
import { validateSurveyAnswers } from './survey-domain';
import type { SurveyAnswer } from './survey-contracts';

type Ballot = Readonly<{
  choices: readonly string[];
  abstain: boolean;
  answers?: readonly SurveyAnswer[];
}>;
async function assertCanCast(
  transaction: Transaction,
  record: typeof votings.$inferSelect,
  userId: string,
): Promise<void> {
  if (record.status !== 'OPEN') {
    throw new DomainError(HTTP.conflict, 'VOTING_NOT_OPEN', 'Голосование сейчас закрыто');
  }
  await assertElectorateAvailable(transaction, record.configuration.electorate);
  const [eligible] = await transaction
    .select()
    .from(votingEligibleVoters)
    .where(
      and(eq(votingEligibleVoters.votingId, record.id), eq(votingEligibleVoters.userId, userId)),
    );
  if (!eligible) {
    throw new DomainError(HTTP.forbidden, 'VOTER_INELIGIBLE', 'Вы не входите в состав избирателей');
  }
  const [existing] = await transaction
    .select()
    .from(votingBallots)
    .where(and(eq(votingBallots.votingId, record.id), eq(votingBallots.userId, userId)));
  if (existing && (record.configuration.survey?.oneResponsePerUser ?? true)) {
    throw new DomainError(HTTP.conflict, 'ALREADY_VOTED', 'Ваш голос уже принят');
  }
}
function validateSubmission(record: typeof votings.$inferSelect, ballot: Ballot): void {
  if (record.configuration.survey) {
    if (ballot.choices.length > 0 || ballot.abstain) {
      throw new DomainError(
        HTTP.badRequest,
        'INVALID_SURVEY_ANSWERS',
        'Анкета не принимает бюллетень голосования',
      );
    }
    validateSurveyAnswers(record.configuration, ballot.answers ?? []);
  } else {
    if (ballot.answers !== undefined) {
      throw new DomainError(
        HTTP.badRequest,
        'INVALID_BALLOT',
        'Голосование не принимает ответы анкеты',
      );
    }
    validateBallot(record.configuration, ballot.choices, ballot.abstain);
  }
}
async function castBallot(
  db: Database['db'],
  input: Readonly<{ id: string; userId: string; ballot: Ballot }>,
): Promise<void> {
  const { id, userId, ballot } = input;
  await db.transaction(async (transaction) => {
    const record = await advance(transaction, await lockedVoting(transaction, id), new Date());
    await assertCanCast(transaction, record, userId);
    validateSubmission(record, ballot);
    const ballotId = crypto.randomUUID();
    await transaction.insert(votingBallots).values({
      id: ballotId,
      votingId: id,
      userId,
      abstain: ballot.abstain,
      answers: ballot.answers === undefined ? null : [...ballot.answers],
      repeatKey:
        record.configuration.survey?.oneResponsePerUser === false ? crypto.randomUUID() : null,
    });
    const options = await transaction
      .select()
      .from(votingOptions)
      .where(eq(votingOptions.votingId, id));
    const selected = options.filter((option) => ballot.choices.includes(option.optionKey));
    if (selected.length > 0) {
      await transaction
        .insert(votingBallotChoices)
        .values(selected.map((option) => ({ ballotId, optionId: option.id })));
    }
  });
}
export { castBallot, type Ballot };
