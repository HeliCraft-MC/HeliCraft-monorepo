import { and, eq, sql } from 'drizzle-orm';
import { spatialWorlds, territoryDrafts, activeTerritories } from '../../db/spatial-schema';
import { monetaryDirectives } from '../../db/monetary-schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { readText } from '../localized-content/service';
import type { TerritoryDraft, SpatialWorld } from './contracts';
import { draftApplication } from './application-summary';

type DraftRecord = typeof territoryDrafts.$inferSelect;
async function worldRecord(
  transaction: Transaction,
  worldId: string,
): Promise<typeof spatialWorlds.$inferSelect> {
  const [world] = await transaction
    .select()
    .from(spatialWorlds)
    .where(eq(spatialWorlds.id, worldId));
  if (!world || world.status !== 'ACTIVE') {
    throw new DomainError(
      HTTP.notFound,
      'SPATIAL_WORLD_UNAVAILABLE',
      'Registered world is unavailable',
    );
  }
  return world;
}
async function editableWorld(transaction: Transaction, worldId: string): Promise<void> {
  const world = await worldRecord(transaction, worldId);
  if (world.dimension !== 'minecraft:overworld') {
    throw new DomainError(
      HTTP.conflict,
      'TERRITORY_DIMENSION',
      'Territories are available only in the Overworld',
    );
  }
}
async function draftRecord(
  transaction: Transaction,
  id: string,
  lock = false,
): Promise<DraftRecord> {
  const query = transaction.select().from(territoryDrafts).where(eq(territoryDrafts.id, id));
  const [draft] = await (lock ? query.for('update') : query);
  if (!draft) {
    throw new DomainError(
      HTTP.notFound,
      'TERRITORY_DRAFT_NOT_FOUND',
      'Territorial draft not found',
    );
  }
  return draft;
}
async function submittedDirectiveId(transaction: Transaction, id: string): Promise<string | null> {
  const [directive] = await transaction
    .select({ id: monetaryDirectives.id })
    .from(monetaryDirectives)
    .where(
      sql`${monetaryDirectives.payload}->>'kind' = 'CHANGE_TERRITORY' and ${monetaryDirectives.payload}->>'draftId' = ${id}`,
    );
  return directive?.id ?? null;
}
async function draftView(transaction: Transaction, record: DraftRecord): Promise<TerritoryDraft> {
  const directiveId = await submittedDirectiveId(transaction, record.id);
  return {
    id: record.id,
    stateId: record.stateId,
    worldId: record.worldId,
    baseRevisionId: record.baseRevisionId,
    geometry: record.geometry,
    change: record.change,
    version: record.version,
    createdBy: record.createdBy,
    hash: record.hash,
    reason: await readText(transaction, record.reasonTextId),
    sealedAt: record.sealedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    directiveId,
    application: await draftApplication(transaction, record.id),
  };
}
async function activeRevisionId(
  transaction: Transaction,
  stateId: string,
  worldId: string,
): Promise<string | null> {
  const [active] = await transaction
    .select()
    .from(activeTerritories)
    .where(and(eq(activeTerritories.stateId, stateId), eq(activeTerritories.worldId, worldId)));
  return active?.revisionId ?? null;
}
async function worldView(
  transaction: Transaction,
  world: typeof spatialWorlds.$inferSelect,
): Promise<SpatialWorld> {
  return {
    id: world.id,
    logicalKey: world.logicalKey,
    backendId: world.backendId,
    paperWorldId: world.paperWorldId,
    dimension: world.dimension,
    tileKey: world.tileKey,
    maxZoom: world.maxZoom,
    extraZoom: world.extraZoom,
    status: world.status,
    version: world.version,
    name: await readText(transaction, world.nameTextId),
  };
}
async function assertCurrentBase(transaction: Transaction, draft: DraftRecord): Promise<void> {
  if (
    (await activeRevisionId(transaction, draft.stateId, draft.worldId)) !== draft.baseRevisionId
  ) {
    throw new DomainError(
      HTTP.conflict,
      'TERRITORY_STALE',
      'The published territory changed; prepare a new draft',
    );
  }
}
export {
  submittedDirectiveId,
  worldRecord,
  editableWorld,
  draftRecord,
  draftView,
  activeRevisionId,
  worldView,
  assertCurrentBase,
  type DraftRecord,
};
