// oxlint-disable import/max-dependencies -- Draft submission composes normalized text, existing Governance and PostGIS validation in one transaction.
import { and, eq, desc, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { territoryDrafts } from '../../db/schema';
import { createText } from '../localized-content/service';
import { resolveText } from '../localized-content/contracts';
import { DomainError, HTTP } from '../errors';
import { MonetaryDirectiveService } from '../monetary/directives';
import { editorState } from './authority';
import type { MonetaryActor } from './authority';
import { TerritoryDraftInputSchema } from './contracts';
import type { TerritoryDraftInput, TerritoryDraft, SpatialAnalysis } from './contracts';
import {
  submittedDirectiveId,
  editableWorld,
  activeRevisionId,
  draftRecord,
  draftView,
  assertCurrentBase,
} from './store';
import { parseGeometry, analyzeGeometry, assertPublishable } from './geometry';

const DRAFT_PAGE_SIZE = 50;
class TerritoryDraftService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async create(
    stateId: string,
    actor: MonetaryActor,
    raw: TerritoryDraftInput,
  ): Promise<TerritoryDraft> {
    const input = TerritoryDraftInputSchema.parse(raw);
    return await this.db.transaction(async (transaction) => {
      await editorState(transaction, stateId, actor);
      await editableWorld(transaction, input.worldId);
      const [draft] = await transaction
        .insert(territoryDrafts)
        .values({
          stateId,
          worldId: input.worldId,
          baseRevisionId: await activeRevisionId(transaction, stateId, input.worldId),
          geometry: input.geometry === null ? null : parseGeometry(input.geometry),
          reasonTextId: await createText(transaction, input.reason),
          change: input.change,
          createdBy: actor.id,
        })
        .returning();
      if (!draft) {
        throw new Error('Draft insert failed');
      }
      return await draftView(transaction, draft);
    });
  }
  public async list(stateId: string, actor: MonetaryActor): Promise<TerritoryDraft[]> {
    return await this.db.transaction(async (transaction) => {
      await editorState(transaction, stateId, actor);
      const drafts = await transaction
        .select()
        .from(territoryDrafts)
        .where(eq(territoryDrafts.stateId, stateId))
        .orderBy(desc(territoryDrafts.updatedAt))
        .limit(DRAFT_PAGE_SIZE);
      const result: TerritoryDraft[] = [];
      for (const draft of drafts) {
        // oxlint-disable-next-line no-await-in-loop -- Hydrate bounded protected drafts on one transaction connection.
        result.push(await draftView(transaction, draft));
      }
      return result;
    });
  }
  public async detail(id: string, actor: MonetaryActor): Promise<TerritoryDraft> {
    return await this.db.transaction(async (transaction) => {
      const draft = await draftRecord(transaction, id);
      await editorState(transaction, draft.stateId, actor);
      return await draftView(transaction, draft);
    });
  }
  public async save(
    id: string,
    actor: MonetaryActor,
    raw: TerritoryDraftInput & { version: number },
  ): Promise<TerritoryDraft> {
    const { version, ...values } = raw;
    const input = TerritoryDraftInputSchema.parse(values);
    return await this.db.transaction(async (transaction) => {
      const initial = await draftRecord(transaction, id);
      await editorState(transaction, initial.stateId, actor);
      const draft = await draftRecord(transaction, id, true);
      if (draft.sealedAt !== null || draft.version !== version || draft.worldId !== input.worldId) {
        throw new DomainError(
          HTTP.conflict,
          'TERRITORY_DRAFT_VERSION',
          'Draft changed or was submitted; reload before saving',
        );
      }
      await editableWorld(transaction, draft.worldId);
      const [updated] = await transaction
        .update(territoryDrafts)
        .set({
          geometry: input.geometry === null ? null : parseGeometry(input.geometry),
          reasonTextId: await createText(transaction, input.reason),
          change: input.change,
          version: draft.version + 1,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(and(eq(territoryDrafts.id, id), eq(territoryDrafts.version, version)))
        .returning();
      if (!updated) {
        throw new Error('Locked draft update failed');
      }
      return await draftView(transaction, updated);
    });
  }
  public async preview(id: string, actor: MonetaryActor): Promise<SpatialAnalysis> {
    return await this.db.transaction(async (transaction) => {
      const draft = await draftRecord(transaction, id);
      await editorState(transaction, draft.stateId, actor);
      await editableWorld(transaction, draft.worldId);
      if (!draft.geometry) {
        throw new DomainError(HTTP.badRequest, 'TERRITORY_EMPTY', 'Draw a territory first');
      }
      return await analyzeGeometry(transaction, { ...draft, geometry: draft.geometry });
    });
  }
  public async submit(id: string, actor: MonetaryActor, version: number): Promise<string> {
    return await this.db.transaction(async (transaction) => {
      const initial = await draftRecord(transaction, id);
      await editorState(transaction, initial.stateId, actor);
      const draft = await draftRecord(transaction, id, true);
      if (draft.sealedAt !== null) {
        const existing = await submittedDirectiveId(transaction, id);
        if (existing !== null && draft.version === version) {
          return existing;
        }
      }
      if (draft.version !== version || draft.sealedAt !== null || draft.geometry === null) {
        throw new DomainError(
          HTTP.conflict,
          'TERRITORY_DRAFT_VERSION',
          'Reload the current unsubmitted draft',
        );
      }
      await editableWorld(transaction, draft.worldId);
      await assertCurrentBase(transaction, draft);
      const view = await draftView(transaction, draft);
      if (!resolveText(view.reason, 'en').value.trim()) {
        throw new DomainError(HTTP.badRequest, 'TERRITORY_REASON_REQUIRED', 'Explain the change');
      }
      assertPublishable(await analyzeGeometry(transaction, { ...draft, geometry: draft.geometry }));
      const [sealed] = await transaction
        .update(territoryDrafts)
        .set({
          sealedAt: sql`clock_timestamp()`,
          updatedAt: sql`clock_timestamp()`,
          hash: sql`helicraft_territory_draft_digest(${territoryDrafts})`,
        })
        .where(eq(territoryDrafts.id, id))
        .returning();
      if (sealed === undefined || sealed.hash === null) {
        throw new Error('Territory seal missing');
      }
      return await MonetaryDirectiveService.createInTransaction(transaction, {
        stateId: draft.stateId,
        actor,
        raw: {
          idempotencyKey: id,
          payload: { kind: 'CHANGE_TERRITORY', draftId: id, draftHash: sealed.hash },
        },
      });
    });
  }
}
export { TerritoryDraftService };
