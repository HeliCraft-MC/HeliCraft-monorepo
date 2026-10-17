import { and, count, desc, eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { adminAuditLog, users, votings, votingBallots } from '../../db/schema';
import { authorizeMutation } from '../permissions/transaction';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { advance, lockedVoting } from './persistence';
import { SurveyResponsesSchema } from './survey-contracts';
import type { z } from '@hono/zod-openapi';

async function lockedSurvey(
  transaction: Transaction,
  id: string,
  actorId: string,
): Promise<typeof votings.$inferSelect> {
  await authorizeMutation(transaction, actorId, 'voting.manage');
  const record = await advance(transaction, await lockedVoting(transaction, id), new Date());
  if (!record.configuration.survey || record.subject || record.governanceRevisionId !== null) {
    throw new DomainError(
      HTTP.conflict,
      'SURVEY_REQUIRED',
      'Действие доступно только для административных анкет',
    );
  }
  return record;
}
class SurveyService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async action(
    id: string,
    actorId: string,
    input: Readonly<{ action: 'close' | 'reopen' | 'archive'; closesAt?: string }>,
  ): Promise<void> {
    const { action, closesAt } = input;
    await this.db.transaction(async (transaction) => {
      const record = await lockedSurvey(transaction, id, actorId);
      let status: typeof record.status = record.status;
      let end = record.closesAt;
      if (action === 'archive' && record.status !== 'ARCHIVED') {
        status = 'ARCHIVED';
      } else if (action === 'close' && ['OPEN', 'SCHEDULED'].includes(record.status)) {
        status = 'CLOSED';
      } else if (
        action === 'reopen' &&
        record.status === 'CLOSED' &&
        (record.configuration.survey?.manualClose === true ||
          (closesAt !== undefined &&
            Date.parse(closesAt) > Date.now() &&
            Date.parse(closesAt) > record.opensAt.getTime()))
      ) {
        status = record.snapshotAt === null ? 'SCHEDULED' : 'OPEN';
        end =
          record.configuration.survey?.manualClose === true || closesAt === undefined
            ? record.closesAt
            : new Date(closesAt);
      } else {
        throw new DomainError(
          HTTP.conflict,
          'INVALID_SURVEY_STATUS',
          'Действие недоступно в текущем состоянии анкеты',
        );
      }
      const configuration = { ...record.configuration, closesAt: end.toISOString() };
      await transaction
        .update(votings)
        .set({ status, closesAt: end, configuration })
        .where(eq(votings.id, id));
      await transaction
        .insert(adminAuditLog)
        .values({ actorId, targetId: id, targetType: 'VOTING', action: `survey.${action}` });
    });
  }
  public async responses(
    id: string,
    actorId: string,
    pagination: Readonly<{ page: number; pageSize: number }>,
  ): Promise<z.infer<typeof SurveyResponsesSchema>> {
    const { page, pageSize } = pagination;
    return await this.db.transaction(async (transaction) => {
      await lockedSurvey(transaction, id, actorId);
      const [total] = await transaction
        .select({ value: count() })
        .from(votingBallots)
        .where(eq(votingBallots.votingId, id));
      const rows = await transaction
        .select({
          id: votingBallots.id,
          userId: users.id,
          username: users.username,
          castAt: votingBallots.castAt,
          answers: votingBallots.answers,
        })
        .from(votingBallots)
        .innerJoin(users, eq(users.id, votingBallots.userId))
        .where(eq(votingBallots.votingId, id))
        .orderBy(desc(votingBallots.castAt), desc(votingBallots.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return SurveyResponsesSchema.parse({
        total: total?.value ?? 0,
        items: rows.map((row) => ({
          id: row.id,
          userId: row.userId,
          username: row.username,
          castAt: row.castAt.toISOString(),
          answers: row.answers ?? [],
        })),
      });
    });
  }
  public async removeResponse(id: string, responseId: string, actorId: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await lockedSurvey(transaction, id, actorId);
      const deleted = await transaction
        .delete(votingBallots)
        .where(and(eq(votingBallots.votingId, id), eq(votingBallots.id, responseId)))
        .returning({ id: votingBallots.id });
      if (deleted.length === 0) {
        throw new DomainError(HTTP.notFound, 'SURVEY_RESPONSE_NOT_FOUND', 'Ответ не найден');
      }
      await transaction.insert(adminAuditLog).values({
        actorId,
        targetId: responseId,
        targetType: 'VOTING_RESPONSE',
        action: 'survey.response.deleted',
        metadata: { votingId: id },
      });
    });
  }
}
export { SurveyService };
