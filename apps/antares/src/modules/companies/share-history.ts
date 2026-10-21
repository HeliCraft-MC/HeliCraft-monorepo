import { asc, desc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  companyShareEvents,
  companyShareOperations,
  companySharePostings,
  legalSubjects,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { CompanyActor } from './decision-contracts';
import { corporateActor } from './decision-commands';
import { assertCompanyReader } from './workspace-read';
import type { ShareHistory } from './share-read-contracts';

const PAGE_SIZE = 20;
async function postingsForEvents(
  transaction: Transaction,
  ids: readonly string[],
): Promise<Map<string, ShareHistory['items'][number]['postings']>> {
  const result = new Map<string, ShareHistory['items'][number]['postings']>();
  if (ids.length === 0) {
    return result;
  }
  const rows = await transaction
    .select({ posting: companySharePostings, subject: legalSubjects })
    .from(companySharePostings)
    .innerJoin(legalSubjects, eq(legalSubjects.id, companySharePostings.subjectId))
    .where(inArray(companySharePostings.eventId, ids))
    .orderBy(asc(companySharePostings.subjectId));
  for (const { posting, subject } of rows) {
    const items = result.get(posting.eventId) ?? [];
    items.push({ owner: { type: subject.kind, id: subject.id }, delta: posting.delta });
    result.set(posting.eventId, items);
  }
  return result;
}
class ShareHistoryService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async list(companyId: string, actor: CompanyActor, page = 1): Promise<ShareHistory> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      await assertCompanyReader(transaction, companyId, actor);
      const rows = await transaction
        .select({ event: companyShareEvents, operation: companyShareOperations.terms })
        .from(companyShareEvents)
        .leftJoin(
          companyShareOperations,
          eq(companyShareOperations.id, companyShareEvents.operationId),
        )
        .where(eq(companyShareEvents.companyId, companyId))
        .orderBy(desc(companyShareEvents.createdAt), desc(companyShareEvents.id))
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);
      const visible = rows.slice(0, PAGE_SIZE);
      const postings = await postingsForEvents(
        transaction,
        visible.map(({ event }) => event.id),
      );
      return {
        page,
        hasMore: rows.length > PAGE_SIZE,
        items: visible.map(({ event, operation }) => ({
          id: event.id,
          issuerId: event.companyId,
          kind: event.kind,
          shares: event.shares,
          actorId: event.actorId,
          createdAt: event.createdAt.toISOString(),
          applicationId: event.applicationId,
          decisionId: event.decisionId,
          stateDirectiveId: event.stateDirectiveId,
          authorizationDecisionId: event.authorizationDecisionId,
          operation,
          postings: postings.get(event.id) ?? [],
        })),
      };
    });
  }
}
export { ShareHistoryService };
