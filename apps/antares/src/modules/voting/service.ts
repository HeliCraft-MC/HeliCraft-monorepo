// oxlint-disable import/max-dependencies -- The shared voting service composes authorization, lifecycle, results and both ballot formats.
// oxlint-disable no-await-in-loop -- Snapshot, option and scheduler writes are serialized on transaction connections.
import { surveyMarkdown } from './survey-markdown';
import { summarizeSurvey } from './survey-domain';
import { castBallot } from './ballots';
import type { Ballot } from './ballots';
import { desc, eq, inArray } from 'drizzle-orm';
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
import { validateVoting, calculateResult } from './domain';
import type { VotingInput, VotingDetail } from './contracts';
import {
  lockedVoting,
  advance,
  hydrateInput,
  persistVoting,
  publishVoting,
  replaceVotingInput,
} from './persistence';

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
  public async update(id: string, actorId: string, input: Readonly<VotingInput>): Promise<void> {
    validateVoting(input);
    await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'voting.manage');
      const record = await lockedVoting(transaction, id);
      if (
        record.status !== 'DRAFT' ||
        record.governanceRevisionId !== null ||
        record.subject !== null
      ) {
        throw new DomainError(
          HTTP.conflict,
          'VOTING_IMMUTABLE',
          'Редактировать можно только неопубликованный черновик опроса',
        );
      }
      await replaceVotingInput(transaction, id, input);
      await transaction
        .insert(adminAuditLog)
        .values({ actorId, targetId: id, targetType: 'VOTING', action: 'voting.updated' });
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
      if (
        record.status === 'CLOSED' ||
        record.status === 'CANCELLED' ||
        record.status === 'ARCHIVED'
      ) {
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
  public async cast(id: string, userId: string, ballot: Ballot): Promise<void> {
    await castBallot(this.db, { id, userId, ballot });
  }
  // oxlint-disable-next-line max-lines-per-function -- The locked read advances lifecycle and enforces ballot/result visibility.
  public async detail(id: string, userId: string, admin: boolean): Promise<VotingDetail> {
    // oxlint-disable-next-line max-lines-per-function -- Voting detail is read under one lock.
    return await this.db.transaction(async (transaction) => {
      if (admin) {
        await authorizeMutation(transaction, userId, 'voting.manage');
      }
      const record = await advance(transaction, await lockedVoting(transaction, id), new Date());
      if (['DRAFT', 'CANCELLED', 'ARCHIVED'].includes(record.status) && !admin) {
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
        surveyHtml: input.survey ? await surveyMarkdown(input) : undefined,
        status: record.status,
        input,
        eligible,
        hasVoted: ballots.some((ballot) => ballot.userId === userId),
        result:
          result && input.survey
            ? {
                ...result,
                survey: summarizeSurvey(
                  input,
                  ballots.map((ballot) => ballot.answers ?? []),
                ),
              }
            : result,
        governanceRevisionId: record.governanceRevisionId,
        subject: record.subject,
      };
    });
  }
}
export { VotingService };
