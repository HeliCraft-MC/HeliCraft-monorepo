import { and, eq } from 'drizzle-orm';
import type { votings } from '../../db/schema';
import type { Database } from '../../db';
import {
  votingBallots,
  votingBallotChoices,
  votingOptions,
  votingEligibleVoters,
  legalSubjects,
  users,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assertVotingElectorate } from './electorates';
import { lockedVoting, advance } from './persistence';
import { validateBallot } from './domain';
import { validateSurveyAnswers } from './survey-domain';
import type { SurveyAnswer } from './survey-contracts';

type Ballot = Readonly<{
  choices: readonly string[];
  abstain: boolean;
  answers?: readonly SurveyAnswer[];
}>;
type EntityBallotSource =
  | Readonly<{ companyDecisionId: string; stateDirectiveId?: never }>
  | Readonly<{ companyDecisionId?: never; stateDirectiveId: string }>;
async function assertPersonalVoter(
  transaction: Transaction,
  voter: typeof votingEligibleVoters.$inferSelect,
  actorId: string,
): Promise<void> {
  if (voter.userId === actorId) {
    return;
  }
  const [subject] =
    voter.subjectId === null
      ? []
      : await transaction.select().from(legalSubjects).where(eq(legalSubjects.id, voter.subjectId));
  if (subject?.kind !== 'PLAYER' || subject.playerId !== actorId) {
    throw new DomainError(
      HTTP.forbidden,
      'ENTITY_VOTING_AUTHORITY_REQUIRED',
      'Для голоса юридического лица требуется его действительное решение',
    );
  }
}
async function assertCanCast(
  transaction: Transaction,
  record: typeof votings.$inferSelect,
  input: Readonly<{ actorId: string; voterId: string; source?: EntityBallotSource }>,
): Promise<void> {
  if (record.status !== 'OPEN') {
    throw new DomainError(HTTP.conflict, 'VOTING_NOT_OPEN', 'Голосование сейчас закрыто');
  }
  await assertVotingElectorate(transaction, record.configuration.electorate);
  const [actor] = await transaction
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, input.actorId));
  if (actor?.status !== 'ACTIVE') {
    throw new DomainError(HTTP.forbidden, 'ACTOR_INACTIVE', 'Аккаунт недоступен');
  }
  const [eligible] = await transaction
    .select()
    .from(votingEligibleVoters)
    .where(
      and(
        eq(votingEligibleVoters.votingId, record.id),
        eq(votingEligibleVoters.voterId, input.voterId),
      ),
    );
  if (!eligible) {
    throw new DomainError(HTTP.forbidden, 'VOTER_INELIGIBLE', 'Вы не входите в состав избирателей');
  }
  if (input.source === undefined) {
    await assertPersonalVoter(transaction, eligible, input.actorId);
  } else if (
    record.configuration.electorate.type !== 'COMPANY_SHAREHOLDERS' ||
    eligible.subjectId !== input.voterId
  ) {
    throw new DomainError(
      HTTP.forbidden,
      'ENTITY_VOTER_INELIGIBLE',
      'Юридическое лицо отсутствует в зафиксированном составе акционеров',
    );
  }
  const [existing] = await transaction
    .select()
    .from(votingBallots)
    .where(and(eq(votingBallots.votingId, record.id), eq(votingBallots.voterId, input.voterId)));
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
async function castBallotInTransaction(
  transaction: Transaction,
  input: Readonly<{
    id: string;
    actorId: string;
    voterId: string;
    ballot: Ballot;
    source?: EntityBallotSource;
  }>,
): Promise<void> {
  const { id, actorId, voterId, ballot, source } = input;
  const record = await advance(transaction, await lockedVoting(transaction, id), new Date());
  await assertCanCast(transaction, record, input);
  validateSubmission(record, ballot);
  const ballotId = crypto.randomUUID();
  await transaction.insert(votingBallots).values({
    id: ballotId,
    votingId: id,
    userId: actorId,
    voterId,
    companyDecisionId: source?.companyDecisionId ?? null,
    stateDirectiveId: source?.stateDirectiveId ?? null,
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
}
async function castBallot(
  db: Database['db'],
  input: Readonly<{ id: string; userId: string; ballot: Ballot }>,
): Promise<void> {
  await db.transaction(async (transaction) => {
    await castBallotInTransaction(transaction, {
      id: input.id,
      actorId: input.userId,
      voterId: input.userId,
      ballot: input.ballot,
    });
  });
}
export { castBallot, castBallotInTransaction, type Ballot, type EntityBallotSource };
