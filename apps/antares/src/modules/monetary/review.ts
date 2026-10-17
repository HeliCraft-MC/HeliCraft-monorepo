import { treatyRevision } from '../diplomacy/store';
import type { TreatyContent } from '../diplomacy/contracts';
import { and, desc, eq } from 'drizzle-orm';
import type { Transaction } from '../permissions/transaction';
import type { Database } from '../../db';
import {
  monetaryDirectives,
  monetaryVotes,
  votingEligibleVoters,
  votings,
  currencies,
} from '../../db/schema';
import { authorizeMutation } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { directiveContext } from './directive-context';
import { directiveRecord, hydratePayload, monetaryActor } from './store';
import type { DirectiveDetail, DirectivePayload, MonetaryActor } from './contracts';

const QUEUE_LIMIT = 50;
async function payloadCurrencyCode(
  transaction: Transaction,
  payload: DirectivePayload,
): Promise<string> {
  if (!('currencyId' in payload)) {
    return '';
  }
  const [currency] = await transaction
    .select({ code: currencies.code })
    .from(currencies)
    .where(eq(currencies.id, payload.currencyId));
  return currency?.code ?? '';
}
class MonetaryReviewService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async pending(actorId: string): Promise<DirectiveDetail[]> {
    return await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'states.manage');
      const rows = await transaction
        .select({ id: monetaryDirectives.id })
        .from(monetaryDirectives)
        .where(eq(monetaryDirectives.status, 'PENDING'))
        .orderBy(desc(monetaryDirectives.createdAt))
        .limit(QUEUE_LIMIT);
      const result: DirectiveDetail[] = [];
      for (const row of rows) {
        // oxlint-disable-next-line no-await-in-loop -- Bounded pending decisions hydrate on one transaction connection.
        const context = await directiveContext(transaction, row.id, { id: actorId, admin: true });
        result.push(context.detail);
      }
      return result;
    });
  }
  public async votingPayload(
    id: string,
    actor: MonetaryActor,
  ): Promise<{
    payload: DirectivePayload;
    payloadHash: string;
    code: string;
    treatyContent: TreatyContent | null;
  }> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      const [link] = await transaction
        .select()
        .from(monetaryVotes)
        .where(eq(monetaryVotes.votingId, id));
      const [eligible] = await transaction
        .select()
        .from(votingEligibleVoters)
        .where(
          and(eq(votingEligibleVoters.votingId, id), eq(votingEligibleVoters.userId, actor.id)),
        );
      if (!link || (!actor.admin && !eligible)) {
        throw new DomainError(HTTP.notFound, 'DIRECTIVE_NOT_FOUND', 'Распоряжение не найдено');
      }
      const record = await directiveRecord(transaction, link.directiveId);
      const [vote] = await transaction.select().from(votings).where(eq(votings.id, id));
      if (
        vote?.subject?.type !== 'MONETARY_DIRECTIVE' ||
        vote.subject.id !== record.id ||
        vote.governanceRevisionId !== record.governanceRevisionId
      ) {
        throw new DomainError(HTTP.notFound, 'DIRECTIVE_NOT_FOUND', 'Распоряжение не найдено');
      }
      const payload = await hydratePayload(transaction, record);
      const code = await payloadCurrencyCode(transaction, payload);
      const treaty =
        'treatyId' in payload ? await treatyRevision(transaction, payload.revisionId) : null;
      return {
        payload,
        payloadHash: record.payloadHash,
        code,
        treatyContent: treaty?.content ?? null,
      };
    });
  }
}
export { MonetaryReviewService };
