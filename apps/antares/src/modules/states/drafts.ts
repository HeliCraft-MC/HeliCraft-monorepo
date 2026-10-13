import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../db';
import { stateDrafts, stateFounders } from '../../db/schema';
import { DomainError, HTTP } from '../errors';
import type { Transaction } from '../permissions/transaction';
import type { StateDraft, StateConfiguration } from './contracts';
import { completion, emptyConfiguration } from './domain';

type DraftRecord = typeof stateDrafts.$inferSelect;
async function describeDraft(
  reader: Database['db'] | Transaction,
  record: Readonly<DraftRecord>,
): Promise<StateDraft> {
  let primaryId = record.ownerId;
  if (record.stateId !== null) {
    const [primary] = await reader
      .select()
      .from(stateFounders)
      .where(and(eq(stateFounders.stateId, record.stateId), eq(stateFounders.type, 'PRIMARY')));
    if (primary === undefined) {
      throw new Error('Primary founder missing');
    }
    primaryId = primary.userId;
  }
  return {
    ...record,
    updatedAt: record.updatedAt.toISOString(),
    deletedAt: record.deletedAt?.toISOString() ?? null,
    progress: completion(record.configuration, primaryId),
  };
}
async function lockedDraft(
  transaction: Transaction,
  id: string,
  ownerId: string,
): Promise<DraftRecord> {
  const [record] = await transaction
    .select()
    .from(stateDrafts)
    .where(
      and(eq(stateDrafts.id, id), eq(stateDrafts.ownerId, ownerId), isNull(stateDrafts.deletedAt)),
    )
    .for('update');
  if (!record) {
    throw new DomainError(HTTP.notFound, 'DRAFT_NOT_FOUND', 'Черновик не найден');
  }
  return record;
}
function assertEditable(record: Readonly<DraftRecord>, version: number): void {
  if (record.submittedStateId !== null) {
    throw new DomainError(HTTP.conflict, 'DRAFT_SUBMITTED', 'Черновик уже опубликован');
  }
  if (record.version !== version) {
    throw new DomainError(
      HTTP.conflict,
      'DRAFT_CONFLICT',
      'Черновик изменён в другой вкладке. Загрузите актуальную версию',
    );
  }
}
class StateDraftService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async list(ownerId: string): Promise<StateDraft[]> {
    const rows = await this.db
      .select()
      .from(stateDrafts)
      .where(
        and(
          eq(stateDrafts.ownerId, ownerId),
          isNull(stateDrafts.deletedAt),
          isNull(stateDrafts.submittedStateId),
        ),
      )
      .orderBy(desc(stateDrafts.updatedAt));
    return await Promise.all(rows.map(async (row) => await describeDraft(this.db, row)));
  }
  public async create(
    ownerId: string,
    title: string,
    source?: Readonly<{
      stateId: string;
      baseRevisionId: string;
      configuration: StateConfiguration;
    }>,
  ): Promise<StateDraft> {
    const [record] = await this.db
      .insert(stateDrafts)
      .values({
        ownerId,
        title,
        configuration: source?.configuration ?? emptyConfiguration(),
        stateId: source?.stateId,
        baseRevisionId: source?.baseRevisionId,
      })
      .returning();
    if (!record) {
      throw new Error('Draft insert returned no row');
    }
    return await describeDraft(this.db, record);
  }
  public async get(id: string, ownerId: string): Promise<StateDraft> {
    return await this.db.transaction(
      async (transaction) =>
        await describeDraft(transaction, await lockedDraft(transaction, id, ownerId)),
    );
  }
  public async save(
    id: string,
    ownerId: string,
    input: Readonly<{
      version: number;
      title: string;
      step: number;
      configuration: StateConfiguration;
    }>,
  ): Promise<StateDraft> {
    return await this.db.transaction(async (transaction) => {
      const record = await lockedDraft(transaction, id, ownerId);
      assertEditable(record, input.version);
      const [updated] = await transaction
        .update(stateDrafts)
        .set({
          title: input.title,
          step: input.step,
          configuration: input.configuration,
          version: record.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(stateDrafts.id, id))
        .returning();
      if (!updated) {
        throw new Error('Draft update returned no row');
      }
      return await describeDraft(transaction, updated);
    });
  }
  public async remove(id: string, ownerId: string, version: number): Promise<void> {
    await this.db.transaction(async (transaction) => {
      const record = await lockedDraft(transaction, id, ownerId);
      assertEditable(record, version);
      await transaction
        .update(stateDrafts)
        .set({ deletedAt: new Date(), version: record.version + 1 })
        .where(eq(stateDrafts.id, id));
    });
  }
}
export { StateDraftService, lockedDraft, assertEditable, describeDraft };
