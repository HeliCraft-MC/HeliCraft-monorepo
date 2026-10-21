// oxlint-disable import/max-dependencies -- The shared voting service composes authorization, lifecycle, results and both ballot formats.
// oxlint-disable no-await-in-loop -- Snapshot, option and scheduler writes are serialized on transaction connections.
import { surveyMarkdown } from './survey-markdown';
import { summarizeSurvey } from './survey-domain';
import { castBallot } from './ballots';
import type { Ballot } from './ballots';
import { desc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../../db';
import type { Transaction } from '../permissions/transaction';
import { votings, votingBallots, adminAuditLog } from '../../db/schema';
import { authorizeMutation } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { validateVoting } from './domain';
import { storedVotingResult } from './results';
import { personalVoter, corporateVotingReader } from './read-access';
import { entityVotingParticipants } from './entity-read';
import { companyActor } from '../companies/store';
import type { VotingInput, VotingDetail } from './contracts';
import {
  lockedVoting,
  advance,
  hydrateInput,
  persistVoting,
  publishVoting,
  replaceVotingInput,
} from './persistence';

async function corporateVoteReader(
  transaction: Transaction,
  input: Readonly<{ id: string; electorate: VotingInput['electorate'] }>,
  actorId: string,
): Promise<boolean> {
  const { id, electorate } = input;
  const entities = await entityVotingParticipants(transaction, id, actorId);
  return (
    (await personalVoter(transaction, id, actorId)) ||
    (await corporateVotingReader(transaction, electorate, actorId)) ||
    entities.length > 0
  );
}
async function votingBallotRecords(
  transaction: Transaction,
  id: string,
): Promise<(typeof votingBallots.$inferSelect)[]> {
  return await transaction.select().from(votingBallots).where(eq(votingBallots.votingId, id));
}
class VotingService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async create(actorId: string, input: Readonly<VotingInput>): Promise<string> {
    validateVoting(input);
    if ('companyId' in input.electorate) {
      throw new DomainError(
        HTTP.conflict,
        'CORPORATE_VOTING_BINDING_REQUIRED',
        'Корпоративное голосование создаётся только из действительного решения компании',
      );
    }
    return await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'voting.manage');
      return await persistVoting(transaction, actorId, input);
    });
  }
  public async update(id: string, actorId: string, input: Readonly<VotingInput>): Promise<void> {
    validateVoting(input);
    if ('companyId' in input.electorate) {
      throw new DomainError(
        HTTP.conflict,
        'CORPORATE_VOTING_BINDING_REQUIRED',
        'Корпоративное голосование создаётся только из действительного решения компании',
      );
    }
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
        .select({ id: votings.id, configuration: votings.configuration })
        .from(votings)
        .where(admin ? undefined : inArray(votings.status, ['SCHEDULED', 'OPEN', 'CLOSED']))
        .orderBy(desc(votings.createdAt));
      if (rows.some((row) => 'companyId' in row.configuration.electorate)) {
        // Legal-owner authorization reads lock corporate heads, so lists follow the same authorization/ownership order as votes and company commands.
        await companyActor(transaction, actorId);
      }
      const visible: string[] = [];
      for (const row of rows) {
        if (admin || !('companyId' in row.configuration.electorate)) {
          visible.push(row.id);
        } else {
          // oxlint-disable-next-line no-await-in-loop -- Private corporate votes are filtered through the same frozen and current authorities before returning their IDs.
          const allowed = await corporateVoteReader(
            transaction,
            { id: row.id, electorate: row.configuration.electorate },
            actorId,
          );
          if (allowed) {
            visible.push(row.id);
          }
        }
      }
      return visible;
    });
  }
  public async cast(id: string, userId: string, ballot: Ballot): Promise<void> {
    await castBallot(this.db, { id, userId, ballot });
  }
  public async detail(id: string, userId: string, admin: boolean): Promise<VotingDetail> {
    return await this.db.transaction(async (transaction) => {
      if (admin) {
        await authorizeMutation(transaction, userId, 'voting.manage');
      }
      const record = await advance(transaction, await lockedVoting(transaction, id), new Date());
      if (['DRAFT', 'CANCELLED', 'ARCHIVED'].includes(record.status) && !admin) {
        throw new DomainError(HTTP.notFound, 'VOTING_NOT_FOUND', 'Голосование не найдено');
      }
      const input = await hydrateInput(transaction, record);
      const eligible = await personalVoter(transaction, id, userId);
      const entityVoters = await entityVotingParticipants(transaction, id, userId);
      const corporateReader =
        entityVoters.length > 0 ||
        (await corporateVotingReader(transaction, input.electorate, userId));
      if ('companyId' in input.electorate && !admin && !eligible && !corporateReader) {
        throw new DomainError(HTTP.notFound, 'VOTING_NOT_FOUND', 'Голосование не найдено');
      }
      const ballots = await votingBallotRecords(transaction, id);
      const visible =
        admin ||
        input.resultVisibility === 'PUBLIC' ||
        (input.resultVisibility === 'AFTER_CLOSE' && record.status === 'CLOSED') ||
        (input.resultVisibility === 'ELIGIBLE_ONLY' && (eligible || corporateReader));
      const result = visible ? await storedVotingResult(transaction, id, input) : null;
      return {
        id,
        surveyHtml: input.survey ? await surveyMarkdown(input) : undefined,
        status: record.status,
        input,
        eligible,
        entityVoters,
        hasVoted: eligible && ballots.some((ballot) => ballot.voterId === userId),
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
        companyRevisionId: record.companyRevisionId,
        subject: record.subject,
      };
    });
  }
}
export { VotingService };
