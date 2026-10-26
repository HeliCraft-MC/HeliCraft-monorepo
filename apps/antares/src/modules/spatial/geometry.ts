import { and, eq, ne, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { activeTerritories, territoryRevisions } from '../../db/spatial-schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { SPATIAL_LIMITS, TerritoryGeometrySchema } from './contracts';
import type { TerritoryGeometry, SpatialAnalysis } from './contracts';

const NARROWNESS_WARNING = 1000;
interface GeometryInput {
  readonly stateId: string;
  readonly worldId: string;
  readonly geometry: TerritoryGeometry;
}
interface GeometryMetrics {
  readonly valid: boolean;
  readonly problem: string;
  readonly area: number;
  readonly vertices: number;
  readonly perimeter: number;
}
function parseGeometry(raw: TerritoryGeometry): TerritoryGeometry {
  const geometry = TerritoryGeometrySchema.parse(raw);
  if (Buffer.byteLength(JSON.stringify(geometry), 'utf8') > SPATIAL_LIMITS.payloadBytes) {
    throw new DomainError(
      HTTP.badRequest,
      'SPATIAL_PAYLOAD_LIMIT',
      'Territorial geometry is too large',
    );
  }
  return geometry;
}
async function geometryMetrics(transaction: Transaction, shape: SQL): Promise<GeometryMetrics> {
  const [metrics] = await transaction
    .select({
      valid: sql<boolean>`ST_IsValid(${shape})`,
      problem: sql<string>`ST_IsValidReason(${shape})`,
      area: sql<number>`ST_Area(${shape})`,
      vertices: sql<number>`ST_NPoints(${shape})`,
      perimeter: sql<number>`ST_Perimeter(${shape})`,
    })
    .from(sql`(select 1) as spatial_metrics`);
  if (!metrics) {
    throw new Error('PostGIS metrics missing');
  }
  return metrics;
}
function geometryProblem(metrics: GeometryMetrics): string | null {
  if (!metrics.valid) {
    return metrics.problem;
  }
  if (metrics.area <= 0) {
    return 'Territory must have positive area';
  }
  if (metrics.area > SPATIAL_LIMITS.area) {
    return 'Territory exceeds the configured area limit';
  }
  return null;
}
async function geometryConflicts(
  transaction: Transaction,
  input: GeometryInput,
  shape: SQL,
): Promise<SpatialAnalysis['conflicts']> {
  return await transaction
    .select({
      stateId: activeTerritories.stateId,
      area: sql<number>`ST_Area(ST_Intersection(${territoryRevisions.geom},${shape}))`,
    })
    .from(activeTerritories)
    .innerJoin(territoryRevisions, eq(territoryRevisions.id, activeTerritories.revisionId))
    .where(
      and(
        eq(activeTerritories.worldId, input.worldId),
        ne(activeTerritories.stateId, input.stateId),
        sql`${territoryRevisions.geom} && ${shape} and ST_Relate(${territoryRevisions.geom},${shape},'2********')`,
      ),
    );
}
async function geometryDifference(
  transaction: Transaction,
  input: GeometryInput,
  shape: SQL,
): Promise<Pick<SpatialAnalysis, 'addedArea' | 'removedArea'> | undefined> {
  const [difference] = await transaction
    .select({
      addedArea: sql<number>`ST_Area(ST_Difference(${shape},${territoryRevisions.geom}))`,
      removedArea: sql<number>`ST_Area(ST_Difference(${territoryRevisions.geom},${shape}))`,
    })
    .from(activeTerritories)
    .innerJoin(territoryRevisions, eq(territoryRevisions.id, activeTerritories.revisionId))
    .where(
      and(
        eq(activeTerritories.worldId, input.worldId),
        eq(activeTerritories.stateId, input.stateId),
      ),
    );
  return difference;
}
function geometryWarnings(geometry: TerritoryGeometry, metrics: GeometryMetrics): string[] {
  const warnings: string[] = [];
  if ((metrics.perimeter * metrics.perimeter) / metrics.area > NARROWNESS_WARNING) {
    warnings.push('NARROW_OR_COMPLEX_SHAPE');
  }
  if (geometry.type === 'MultiPolygon' && geometry.coordinates.length > 1) {
    warnings.push('DISCONNECTED_COMPONENTS_REQUIRE_REVIEW');
  }
  return warnings;
}
async function analyzeGeometry(
  transaction: Transaction,
  input: GeometryInput,
): Promise<SpatialAnalysis> {
  const geometry = parseGeometry(input.geometry);
  const shape = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),0)`;
  const metrics = await geometryMetrics(transaction, shape);
  const problem = geometryProblem(metrics);
  if (problem !== null) {
    return {
      valid: false,
      problem,
      area: Math.max(0, metrics.area),
      vertices: metrics.vertices,
      addedArea: 0,
      removedArea: 0,
      warnings: [],
      conflicts: [],
    };
  }
  const difference = await geometryDifference(transaction, input, shape);
  return {
    valid: true,
    problem: null,
    area: metrics.area,
    vertices: metrics.vertices,
    addedArea: difference?.addedArea ?? metrics.area,
    removedArea: difference?.removedArea ?? 0,
    warnings: geometryWarnings(geometry, metrics),
    conflicts: await geometryConflicts(transaction, input, shape),
  };
}
function assertPublishable(analysis: SpatialAnalysis): void {
  if (!analysis.valid || analysis.conflicts.length > 0) {
    throw new DomainError(
      HTTP.conflict,
      'TERRITORY_GEOMETRY_CONFLICT',
      analysis.problem ?? 'Territory overlaps another state',
    );
  }
}
export { parseGeometry, analyzeGeometry, assertPublishable };
