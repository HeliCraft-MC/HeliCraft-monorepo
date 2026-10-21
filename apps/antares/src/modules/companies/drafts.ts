import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { companies, companyDrafts, legalSubjects } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { emptyCompanyConfiguration, draftDto } from './draft-configuration';
import { CompanyDraftSaveSchema } from './registration-contracts';
import type { CompanyDraft, CompanyDraftSave } from './registration-contracts';
import { companyActor, companyRecord, companyAudit, changeCompanyStatus } from './store';
import { canReadFormation } from './formation-access';

type DraftRecord = typeof companyDrafts.$inferSelect;
async function insertCompanyDraft(
  transaction: Transaction,
  input: Pick<
    typeof companyDrafts.$inferInsert,
    'companyId' | 'ownerId' | 'title' | 'configuration' | 'step'
  >,
): Promise<DraftRecord> {
  const [draft] = await transaction.insert(companyDrafts).values(input).returning();
  if (!draft) {
    throw new Error('Company draft insertion failed');
  }
  return draft;
}
async function lockedCompanyDraft(transaction: Transaction, id: string): Promise<DraftRecord> {
  const [record] = await transaction
    .select()
    .from(companyDrafts)
    .where(and(eq(companyDrafts.id, id), isNull(companyDrafts.deletedAt)))
    .for('update');
  if (!record) {
    throw new DomainError(HTTP.notFound, 'COMPANY_DRAFT_NOT_FOUND', 'Черновик компании не найден');
  }
  return record;
}
function assertDraftOwner(record: DraftRecord, actorId: string): void {
  if (record.ownerId !== actorId) {
    throw new DomainError(HTTP.notFound, 'COMPANY_DRAFT_NOT_FOUND', 'Черновик компании не найден');
  }
}
function assertDraftVersion(record: DraftRecord, version: number): void {
  if (record.version !== version || record.submittedApplicationId !== null) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_DRAFT_CONFLICT',
      'Черновик изменён или уже подан. Загрузите актуальную версию',
    );
  }
}
class CompanyDraftService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async byCompany(companyId: string, actorId: string): Promise<CompanyDraft> {
    const [record] = await this.db
      .select({ id: companyDrafts.id })
      .from(companyDrafts)
      .where(and(eq(companyDrafts.companyId, companyId), isNull(companyDrafts.deletedAt)))
      .orderBy(
        desc(sql`${companyDrafts.submittedApplicationId} is null`),
        desc(companyDrafts.updatedAt),
        desc(companyDrafts.id),
      )
      .limit(1);
    if (record === undefined) {
      throw new DomainError(
        HTTP.notFound,
        'COMPANY_DRAFT_NOT_FOUND',
        'Черновик компании не найден',
      );
    }
    return await this.get(record.id, actorId);
  }
  public async create(actorId: string, title: string): Promise<CompanyDraft> {
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const companyId = crypto.randomUUID();
      await transaction.insert(companies).values({ id: companyId, createdBy: actorId });
      await transaction.insert(legalSubjects).values({ id: companyId, kind: 'COMPANY', companyId });
      const draft = await insertCompanyDraft(transaction, {
        companyId,
        ownerId: actorId,
        title,
        configuration: emptyCompanyConfiguration(actorId),
      });
      await companyAudit(transaction, { actorId, companyId, action: 'company.draft.created' });
      return draftDto(draft);
    });
  }
  public async get(id: string, actorId: string): Promise<CompanyDraft> {
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const record = await lockedCompanyDraft(transaction, id);
      if (!(await canReadFormation(transaction, record, actorId))) {
        throw new DomainError(
          HTTP.notFound,
          'COMPANY_DRAFT_NOT_FOUND',
          'Черновик компании не найден',
        );
      }
      return draftDto(record);
    });
  }
  public async list(actorId: string): Promise<CompanyDraft[]> {
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const records = await transaction
        .select()
        .from(companyDrafts)
        .where(and(eq(companyDrafts.ownerId, actorId), isNull(companyDrafts.deletedAt)))
        .orderBy(desc(companyDrafts.updatedAt));
      return records.map((record) => draftDto(record));
    });
  }
  public async save(id: string, actorId: string, input: CompanyDraftSave): Promise<CompanyDraft> {
    const parsed = CompanyDraftSaveSchema.parse(input);
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const record = await lockedCompanyDraft(transaction, id);
      assertDraftOwner(record, actorId);
      assertDraftVersion(record, parsed.version);
      const [saved] = await transaction
        .update(companyDrafts)
        .set({ ...parsed, version: record.version + 1, updatedAt: sql`clock_timestamp()` })
        .where(eq(companyDrafts.id, id))
        .returning();
      if (!saved) {
        throw new Error('Company draft update failed');
      }
      return draftDto(saved);
    });
  }
  public async reopen(id: string, actorId: string): Promise<CompanyDraft> {
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const previous = await lockedCompanyDraft(transaction, id);
      assertDraftOwner(previous, actorId);
      const company = await companyRecord(transaction, previous.companyId);
      if (
        company.status !== 'REJECTED' ||
        previous.submittedApplicationId === null ||
        previous.submittedApplicationId !== company.currentApplicationId
      ) {
        throw new DomainError(
          HTTP.conflict,
          'COMPANY_DRAFT_NOT_REOPENABLE',
          'Изменить можно только актуальную отклонённую заявку',
        );
      }
      const [open] = await transaction
        .select()
        .from(companyDrafts)
        .where(
          and(
            eq(companyDrafts.companyId, company.id),
            isNull(companyDrafts.submittedApplicationId),
            isNull(companyDrafts.deletedAt),
          ),
        );
      if (open) {
        return draftDto(open);
      }
      const draft = await insertCompanyDraft(transaction, {
        companyId: company.id,
        ownerId: actorId,
        title: previous.title,
        step: previous.step,
        configuration: previous.configuration,
      });
      await companyAudit(transaction, {
        actorId,
        companyId: company.id,
        action: 'company.draft.reopened',
        reason: previous.id,
      });
      return draftDto(draft);
    });
  }
  public async remove(id: string, actorId: string, version: number): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const record = await lockedCompanyDraft(transaction, id);
      assertDraftOwner(record, actorId);
      assertDraftVersion(record, version);
      const company = await companyRecord(transaction, record.companyId);
      await transaction
        .update(companyDrafts)
        .set({ deletedAt: sql`clock_timestamp()`, version: record.version + 1 })
        .where(eq(companyDrafts.id, id));
      await changeCompanyStatus(transaction, {
        company,
        actorId,
        status: 'CLOSED',
        reason: 'Unsubmitted company draft withdrawn',
      });
    });
  }
}
export {
  CompanyDraftService,
  lockedCompanyDraft,
  assertDraftOwner,
  assertDraftVersion,
  type DraftRecord,
};

export { emptyCompanyConfiguration, formationHash, draftDto } from './draft-configuration';
