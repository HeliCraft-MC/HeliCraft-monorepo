import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { spatialWorlds, activeTerritories, territoryRevisions } from '../../db/spatial-schema';
import { states, stateGovernanceRevisions, stateRevisionTexts } from '../../db/state-schema';
import { readText } from '../localized-content/service';
import type { Transaction } from '../permissions/transaction';
import { monetaryHash } from '../monetary/domain';
import { DomainError, HTTP } from '../errors';
import { SPATIAL_LIMITS } from './contracts';
import type {
  PublicTerritory,
  PublicTerritorySummary,
  SpatialSnapshot,
  TerritoryGeometry,
} from './contracts';
import type { ServiceActor } from '../minecraft/contracts';

const MAX_TERRITORIES = 1000;
interface SpatialBounds {
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
}
interface SnapshotScope {
  readonly actor: ServiceActor;
  readonly paperWorldId: string;
}
interface TerritoryRow {
  stateId: string;
  slug: string | null;
  color: string;
  nameTextId: string;
  revisionId: string;
  number: number;
  area: number;
  geometry: TerritoryGeometry;
}
async function snapshotWorld(
  transaction: Transaction,
  worldId: string,
  scope?: SnapshotScope,
): Promise<typeof spatialWorlds.$inferSelect> {
  const [world] = await transaction
    .select()
    .from(spatialWorlds)
    .where(eq(spatialWorlds.id, worldId))
    .for('share');
  if (
    !world ||
    world.status !== 'ACTIVE' ||
    (scope &&
      (scope.actor.role !== 'DENEB' ||
        scope.actor.backendId !== world.backendId ||
        scope.paperWorldId !== world.paperWorldId))
  ) {
    throw new DomainError(
      HTTP.notFound,
      'SPATIAL_WORLD_UNAVAILABLE',
      'No spatial snapshot for this world identity',
    );
  }
  return world;
}
async function territoryRows(
  transaction: Transaction,
  worldId: string,
  bounds?: SpatialBounds,
): Promise<TerritoryRow[]> {
  return await transaction
    .select({
      stateId: states.id,
      slug: states.slug,
      color: sql<string>`${stateGovernanceRevisions.configuration}->>'color'`,
      nameTextId: stateRevisionTexts.textId,
      revisionId: territoryRevisions.id,
      number: territoryRevisions.number,
      area: territoryRevisions.area,
      geometry: territoryRevisions.geometry,
    })
    .from(activeTerritories)
    .innerJoin(territoryRevisions, eq(territoryRevisions.id, activeTerritories.revisionId))
    .innerJoin(states, eq(states.id, activeTerritories.stateId))
    .innerJoin(stateGovernanceRevisions, eq(stateGovernanceRevisions.id, states.currentRevisionId))
    .innerJoin(
      stateRevisionTexts,
      and(
        eq(stateRevisionTexts.revisionId, states.currentRevisionId),
        eq(stateRevisionTexts.path, 'name'),
      ),
    )
    .where(
      and(
        eq(activeTerritories.worldId, worldId),
        bounds === undefined
          ? undefined
          : sql`${territoryRevisions.geom} && ST_MakeEnvelope(${bounds.minX},${bounds.minZ},${bounds.maxX},${bounds.maxZ},0)`,
      ),
    )
    .orderBy(states.id)
    .limit(MAX_TERRITORIES + 1);
}
async function publicTerritory(
  transaction: Transaction,
  row: TerritoryRow,
): Promise<PublicTerritory> {
  return {
    stateId: row.stateId,
    slug: row.slug ?? row.stateId,
    color: row.color,
    name: await readText(transaction, row.nameTextId),
    revisionId: row.revisionId,
    number: row.number,
    area: row.area,
    geometry: row.geometry,
  };
}
async function catalogRows(
  transaction: Transaction,
  worldId: string,
): Promise<Omit<TerritoryRow, 'geometry'>[]> {
  return await transaction
    .select({
      stateId: states.id,
      slug: states.slug,
      color: sql<string>`${stateGovernanceRevisions.configuration}->>'color'`,
      nameTextId: stateRevisionTexts.textId,
      revisionId: territoryRevisions.id,
      number: territoryRevisions.number,
      area: territoryRevisions.area,
    })
    .from(activeTerritories)
    .innerJoin(territoryRevisions, eq(territoryRevisions.id, activeTerritories.revisionId))
    .innerJoin(states, eq(states.id, activeTerritories.stateId))
    .innerJoin(stateGovernanceRevisions, eq(stateGovernanceRevisions.id, states.currentRevisionId))
    .innerJoin(
      stateRevisionTexts,
      and(
        eq(stateRevisionTexts.revisionId, states.currentRevisionId),
        eq(stateRevisionTexts.path, 'name'),
      ),
    )
    .where(eq(activeTerritories.worldId, worldId))
    .orderBy(states.id)
    .limit(MAX_TERRITORIES + 1);
}
class SpatialSnapshotService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async catalog(worldId: string): Promise<PublicTerritorySummary[]> {
    return await this.db.transaction(async (transaction) => {
      await snapshotWorld(transaction, worldId);
      const rows = await catalogRows(transaction, worldId);
      if (rows.length > MAX_TERRITORIES) {
        throw new DomainError(
          HTTP.unavailable,
          'SPATIAL_CATALOG_LIMIT',
          'Territory catalog exceeds the supported count',
        );
      }
      const result: PublicTerritorySummary[] = [];
      for (const row of rows) {
        // oxlint-disable-next-line no-await-in-loop -- Read the bounded catalog on its single transaction connection.
        const name = await readText(transaction, row.nameTextId);
        result.push({
          stateId: row.stateId,
          slug: row.slug ?? row.stateId,
          color: row.color,
          name,
          revisionId: row.revisionId,
          number: row.number,
          area: row.area,
        });
      }
      if (Buffer.byteLength(JSON.stringify(result), 'utf8') > SPATIAL_LIMITS.snapshotBytes) {
        throw new DomainError(
          HTTP.unavailable,
          'SPATIAL_CATALOG_LIMIT',
          'Territory catalog exceeds the supported payload',
        );
      }
      return result;
    });
  }
  public async snapshot(
    worldId: string,
    scope?: SnapshotScope,
    bounds?: SpatialBounds,
  ): Promise<SpatialSnapshot> {
    return await this.db.transaction(async (transaction) => {
      const world = await snapshotWorld(transaction, worldId, scope);
      const rows = await territoryRows(transaction, worldId, bounds);
      if (rows.length > MAX_TERRITORIES) {
        throw new DomainError(
          HTTP.unavailable,
          'SPATIAL_SNAPSHOT_LIMIT',
          'Snapshot exceeds the supported territory count',
        );
      }
      const territories: PublicTerritory[] = [];
      for (const row of rows) {
        // oxlint-disable-next-line no-await-in-loop -- Read localized names in order on the snapshot transaction connection.
        territories.push(await publicTerritory(transaction, row));
      }
      const core = {
        schemaVersion: 1 as const,
        worldId,
        paperWorldId: world.paperWorldId,
        dimension: world.dimension,
        version: world.version,
        territories,
      };
      if (Buffer.byteLength(JSON.stringify(core), 'utf8') > SPATIAL_LIMITS.snapshotBytes) {
        throw new DomainError(
          HTTP.unavailable,
          'SPATIAL_SNAPSHOT_LIMIT',
          'Snapshot exceeds the supported payload size',
        );
      }
      return { ...core, integrity: monetaryHash(core), generatedAt: new Date().toISOString() };
    });
  }
  public async lookup(worldId: string, x: number, z: number): Promise<string | null> {
    const [match] = await this.db
      .select({ stateId: activeTerritories.stateId })
      .from(activeTerritories)
      .innerJoin(territoryRevisions, eq(territoryRevisions.id, activeTerritories.revisionId))
      .innerJoin(spatialWorlds, eq(spatialWorlds.id, activeTerritories.worldId))
      .where(
        and(
          eq(activeTerritories.worldId, worldId),
          eq(spatialWorlds.status, 'ACTIVE'),
          sql`ST_Contains(${territoryRevisions.geom},ST_SetSRID(ST_MakePoint(${x},${z}),0))`,
        ),
      );
    return match?.stateId ?? null;
  }
}
export { SpatialSnapshotService, type SpatialBounds };
