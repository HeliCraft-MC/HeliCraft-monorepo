// oxlint-disable no-await-in-loop -- Snapshot, option and scheduler writes are serialized on transaction connections.
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  votings,
  votingOptions,
  votingEligibleVoters,
  votingBallots,
  votingBallotChoices,
  adminAuditLog,
} from '../../db/schema';
import { authorizeMutation } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assertElectorateAvailable } from './eligibility';
import { validateVoting, validateBallot, calculateResult } from './domain';
import type { VotingInput, VotingDetail } from './contracts';
import { lockedVoting, advance, hydrateInput, persistVoting, publishVoting } from './persistence';

class VotingService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async create(actorId: string, input: Readonly<VotingInput>): Promise<string> {
    validateVoting(input);
    return await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'voting.manage');
      return await persistVoting(transaction, actorId, input);
    });
  }
  public async publish(id: string, actorId: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'voting.manage');
      await publishVoting(transaction, id);
      await transaction
        .insert(adminAuditLog)
        .values({ actorId, targetId: id, targetType: 'VOTING', action: 'voting.published' });
    });
  }
  public async cancel(id: string, actorId: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'voting.manage');
      const record = await lockedVoting(transaction, id);
      if (record.status === 'CLOSED' || record.status === 'CANCELLED') {
        throw new DomainError(HTTP.conflict, 'INVALID_VOTING_STATUS', 'Голосование уже завершено');
      }
      await transaction.update(votings).set({ status: 'CANCELLED' }).where(eq(votings.id, id));
      await transaction
        .insert(adminAuditLog)
        .values({ actorId, targetId: id, targetType: 'VOTING', action: 'voting.cancelled' });
    });
  }
  public async tick(): Promise<void> {
    const records = await this.db
      .select({ id: votings.id })
      .from(votings)
      .where(inArray(votings.status, ['SCHEDULED', 'OPEN']));
    for (const record of records) {
      await this.db.transaction(async (transaction) => {
        await advance(transaction, await lockedVoting(transaction, record.id), new Date());
      });
    }
  }
  public async list(actorId: string, admin: boolean): Promise<string[]> {
    return await this.db.transaction(async (transaction) => {
      if (admin) {
        await authorizeMutation(transaction, actorId, 'voting.manage');
      }
      const rows = await transaction
        .select({ id: votings.id })
        .from(votings)
        .where(admin ? undefined : inArray(votings.status, ['SCHEDULED', 'OPEN', 'CLOSED']))
        .orderBy(desc(votings.createdAt));
      return rows.map((row) => row.id);
    });
  }
  public async cast(
    id: string,
    userId: string,
    ballot: Readonly<{ choices: readonly string[]; abstain: boolean }>,
  ): Promise<void> {
    const { choices, abstain } = ballot;
    await this.db.transaction(async (transaction) => {
      const record = await advance(transaction, await lockedVoting(transaction, id), new Date());
      if (record.status !== 'OPEN') {
        throw new DomainError(HTTP.conflict, 'VOTING_NOT_OPEN', 'Голосование сейчас закрыто');
      }
      await assertElectorateAvailable(transaction, record.configuration.electorate);
      const [eligible] = await transaction
        .select()
        .from(votingEligibleVoters)
        .where(and(eq(votingEligibleVoters.votingId, id), eq(votingEligibleVoters.userId, userId)));
      if (!eligible) {
        throw new DomainError(
          HTTP.forbidden,
          'VOTER_INELIGIBLE',
          'Вы не входите в состав избирателей',
        );
      }
      const [existing] = await transaction
        .select()
        .from(votingBallots)
        .where(and(eq(votingBallots.votingId, id), eq(votingBallots.userId, userId)));
      if (existing) {
        throw new DomainError(HTTP.conflict, 'ALREADY_VOTED', 'Ваш голос уже принят');
      }
      validateBallot(record.configuration, choices, abstain);
      const ballotId = crypto.randomUUID();
      await transaction
        .insert(votingBallots)
        .values({ id: ballotId, votingId: id, userId, abstain });
      const options = await transaction
        .select()
        .from(votingOptions)
        .where(eq(votingOptions.votingId, id));
      const selected = options.filter((option) => choices.includes(option.optionKey));
      if (selected.length > 0) {
        await transaction
          .insert(votingBallotChoices)
          .values(selected.map((option) => ({ ballotId, optionId: option.id })));
      }
    });
  }
  // oxlint-disable-next-line max-lines-per-function -- The locked read advances lifecycle and enforces ballot/result visibility.
  public async detail(id: string, userId: string, admin: boolean): Promise<VotingDetail> {
    // oxlint-disable-next-line max-lines-per-function -- Voting detail is read under one lock.
    return await this.db.transaction(async (transaction) => {
      if (admin) {
        await authorizeMutation(transaction, userId, 'voting.manage');
      }
      const record = await advance(transaction, await lockedVoting(transaction, id), new Date());
      if ((record.status === 'DRAFT' || record.status === 'CANCELLED') && !admin) {
        throw new DomainError(HTTP.notFound, 'VOTING_NOT_FOUND', 'Голосование не найдено');
      }
      const input = await hydrateInput(transaction, record);
      const electorate = await transaction
        .select()
        .from(votingEligibleVoters)
        .where(eq(votingEligibleVoters.votingId, id));
      const eligible = electorate.some((voter) => voter.userId === userId);
      const ballots = await transaction
        .select()
        .from(votingBallots)
        .where(eq(votingBallots.votingId, id));
      const choices = await transaction
        .select({ ballotId: votingBallotChoices.ballotId, optionKey: votingOptions.optionKey })
        .from(votingBallotChoices)
        .innerJoin(votingOptions, eq(votingOptions.id, votingBallotChoices.optionId))
        .where(eq(votingOptions.votingId, id));
      const visible =
        admin ||
        input.resultVisibility === 'PUBLIC' ||
        (input.resultVisibility === 'AFTER_CLOSE' && record.status === 'CLOSED') ||
        (input.resultVisibility === 'ELIGIBLE_ONLY' && eligible);
      const result = visible
        ? calculateResult(
            input,
            electorate.length,
            ballots.map((ballot) => ({
              abstain: ballot.abstain,
              choices: choices
                .filter((choice) => choice.ballotId === ballot.id)
                .map((choice) => choice.optionKey),
            })),
          )
        : null;
      return {
        id,
        status: record.status,
        input,
        eligible,
        hasVoted: ballots.some((ballot) => ballot.userId === userId),
        result,
        governanceRevisionId: record.governanceRevisionId,
        subject: record.subject,
      };
    });
  }
}
export { VotingService };
