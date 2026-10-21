import { desc, eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { companyDecisions, companyStatusHistory } from '../../db/schema';
import { DomainError, HTTP } from '../errors';
import type { CompanyActor } from './decision-contracts';
import { corporateActor } from './decision-commands';
import { companyRecord, changeCompanyStatus } from './store';
import { assertCompanyReader } from './company-read-access';
import { companyDecisionProofs } from './decision-proofs';
import { HISTORY_PAGE_SIZE, CompanyStatusChangeSchema } from './lifecycle-contracts';
import type {
  CompanyStatusChange,
  CompanyLifecyclePage,
  CompanyManualQueue,
} from './lifecycle-contracts';

class CompanyLifecycleService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async change(id: string, actorId: string, raw: CompanyStatusChange): Promise<void> {
    const input = CompanyStatusChangeSchema.parse(raw);
    await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, { id: actorId, admin: true });
      const company = await companyRecord(transaction, id);
      if (
        company.status !== input.previousStatus ||
        company.foundedAt === null ||
        company.status === input.status
      ) {
        throw new DomainError(
          HTTP.conflict,
          'COMPANY_STATUS_CHANGED',
          'Статус компании изменился или переход недоступен',
        );
      }
      await changeCompanyStatus(transaction, {
        company,
        actorId,
        status: input.status,
        reason: input.reason,
      });
    });
  }
  public async history(
    id: string,
    actor: CompanyActor,
    page: number,
  ): Promise<CompanyLifecyclePage> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      await assertCompanyReader(transaction, id, actor);
      const records = await transaction
        .select()
        .from(companyStatusHistory)
        .where(eq(companyStatusHistory.companyId, id))
        .orderBy(desc(companyStatusHistory.number))
        .limit(HISTORY_PAGE_SIZE + 1)
        .offset((page - 1) * HISTORY_PAGE_SIZE);
      return {
        items: records.slice(0, HISTORY_PAGE_SIZE).map((record) => ({
          id: record.id,
          number: record.number,
          status: record.status,
          previousStatus: record.previousStatus,
          actorId: record.actorId,
          reason: record.reason,
          applicationId: record.applicationId,
          createdAt: record.createdAt.toISOString(),
        })),
        page,
        hasMore: records.length > HISTORY_PAGE_SIZE,
      };
    });
  }
  public async manualQueue(actorId: string, page: number): Promise<CompanyManualQueue> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, { id: actorId, admin: true });
      const records = await transaction
        .select()
        .from(companyDecisions)
        .where(eq(companyDecisions.status, 'PENDING'))
        .orderBy(desc(companyDecisions.createdAt), desc(companyDecisions.id));
      const pending: CompanyManualQueue['items'] = [];
      for (const record of records) {
        // oxlint-disable-next-line no-await-in-loop -- Manual review is derived from each decision's actual pinned requirements before pagination on the graph-locked transaction.
        const proof = await companyDecisionProofs(transaction, record.id);
        if (proof.requirements.manual) {
          pending.push({
            id: record.id,
            companyId: record.companyId,
            kind: record.payload.kind,
            createdAt: record.createdAt.toISOString(),
          });
        }
      }
      const start = (page - 1) * HISTORY_PAGE_SIZE;
      return {
        items: pending.slice(start, start + HISTORY_PAGE_SIZE),
        page,
        hasMore: pending.length > start + HISTORY_PAGE_SIZE,
      };
    });
  }
}
export { CompanyLifecycleService };
