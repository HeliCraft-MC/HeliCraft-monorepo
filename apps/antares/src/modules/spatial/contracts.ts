// oxlint-disable no-magic-numbers -- Spatial limits, Minecraft coordinate bounds and tile parameters are versioned contracts.
import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';

const SPATIAL_LIMITS = {
  coordinate: 29_999_984,
  vertices: 4096,
  components: 32,
  rings: 256,
  area: 1_000_000_000,
  payloadBytes: 524_288,
  snapshotBytes: 8_388_608,
} as const;
const Coordinate = z.number().min(-SPATIAL_LIMITS.coordinate).max(SPATIAL_LIMITS.coordinate);
const PositionSchema = z.tuple([Coordinate, Coordinate]);
const RingSchema = z.array(PositionSchema).min(4).max(SPATIAL_LIMITS.vertices);
const PolygonCoordinates = z.array(RingSchema).min(1).max(SPATIAL_LIMITS.rings);
const TerritoryGeometrySchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('Polygon'), coordinates: PolygonCoordinates }).strict(),
    z
      .object({
        type: z.literal('MultiPolygon'),
        coordinates: z.array(PolygonCoordinates).min(1).max(SPATIAL_LIMITS.components),
      })
      .strict(),
  ])
  .superRefine((geometry, context) => {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    let vertices = 0;
    let rings = 0;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        vertices += ring.length;
        rings += 1;
        const [first] = ring;
        const last = ring.at(-1);
        if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
          context.addIssue({
            code: 'custom',
            message: 'Every ring must be closed in Minecraft X/Z',
          });
        }
      }
    }
    if (vertices > SPATIAL_LIMITS.vertices || rings > SPATIAL_LIMITS.rings) {
      context.addIssue({ code: 'custom', message: 'Territory exceeds total vertex or ring limit' });
    }
  })
  .openapi('TerritoryGeometry');
const SpatialWorldInputSchema = z
  .object({
    logicalKey: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/u),
    backendId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/u),
    paperWorldId: z.uuid(),
    dimension: z.enum(['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end']),
    name: LocalizedInputSchema,
    tileKey: z.string().regex(/^[a-z0-9_-]{1,96}$/u),
    maxZoom: z.number().int().min(0).max(8).default(3),
    extraZoom: z.number().int().min(0).max(4).default(2),
  })
  .strict()
  .openapi('SpatialWorldInput');
const SpatialWorldSchema = SpatialWorldInputSchema.extend({
  id: z.uuid(),
  status: z.enum(['ACTIVE', 'RETIRED']),
  version: z.number().int().nonnegative(),
}).openapi('SpatialWorld');
const TerritorialChangeSchema = z.enum(['INITIAL', 'EXPAND', 'REDUCE', 'RESHAPE']);
const TerritoryDraftInputSchema = z
  .object({
    worldId: z.uuid(),
    geometry: TerritoryGeometrySchema.nullable().openapi('OptionalTerritoryGeometry'),
    reason: LocalizedInputSchema,
    change: TerritorialChangeSchema,
  })
  .strict()
  .openapi('TerritoryDraftInput');
const TerritorialApplicationSummarySchema = z
  .object({
    id: z.uuid(),
    status: z.enum(['REVIEW', 'APPROVED', 'REJECTED']),
    reason: z.string().nullable(),
    reviewedAt: z.iso.datetime().nullable(),
    revisionId: z.uuid().nullable(),
  })
  .openapi('TerritorialApplicationSummary');
const TerritoryDraftSchema = TerritoryDraftInputSchema.extend({
  id: z.uuid(),
  stateId: z.uuid(),
  baseRevisionId: z.uuid().nullable(),
  version: z.number().int().positive(),
  createdBy: z.uuid(),
  sealedAt: z.iso.datetime().nullable(),
  hash: z.string().nullable(),
  directiveId: z.uuid().nullable(),
  application: TerritorialApplicationSummarySchema.nullable().openapi(
    'OptionalTerritorialApplicationSummary',
  ),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi('TerritoryDraft');
const SpatialAnalysisSchema = z
  .object({
    valid: z.boolean(),
    problem: z.string().nullable(),
    area: z.number().nonnegative(),
    addedArea: z.number().nonnegative(),
    removedArea: z.number().nonnegative(),
    vertices: z.number().int().nonnegative(),
    warnings: z.array(z.string()),
    conflicts: z.array(z.object({ stateId: z.uuid(), area: z.number().positive() })),
  })
  .openapi('SpatialAnalysis');
const TerritoryDecisionDisplaySchema = z
  .object({
    draft: TerritoryDraftSchema,
    analysis: SpatialAnalysisSchema,
  })
  .openapi('TerritoryDecisionDisplay');
const TerritoryDirectiveSchema = z
  .object({
    kind: z.literal('CHANGE_TERRITORY'),
    draftId: z.uuid(),
    draftHash: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict()
  .openapi('TerritoryDirectivePayload');
const TerritoryRevisionSchema = z
  .object({
    id: z.uuid(),
    stateId: z.uuid(),
    worldId: z.uuid(),
    previousRevisionId: z.uuid().nullable(),
    number: z.number().int().positive(),
    applicationId: z.uuid(),
    directiveId: z.uuid(),
    geometry: TerritoryGeometrySchema,
    area: z.number().positive(),
    createdBy: z.uuid(),
    ratifiedBy: z.uuid(),
    effectiveAt: z.iso.datetime(),
  })
  .openapi('TerritoryRevision');
const PublishedTerritoryRevisionSchema = TerritoryRevisionSchema.extend({
  worldVersion: z.number().int().positive(),
  reason: LocalizedInputSchema,
  ratificationReason: z.string(),
}).openapi('PublishedTerritoryRevision');
const TerritoryHistorySchema = z
  .object({
    items: z.array(PublishedTerritoryRevisionSchema),
    page: z.number().int().positive(),
    hasMore: z.boolean(),
  })
  .openapi('TerritoryHistory');
const PublicTerritorySchema = z
  .object({
    stateId: z.uuid(),
    slug: z.string(),
    name: LocalizedInputSchema,
    color: z.string(),
    revisionId: z.uuid(),
    number: z.number().int().positive(),
    area: z.number().positive(),
    geometry: TerritoryGeometrySchema,
  })
  .openapi('PublicTerritory');
const PublicTerritorySummarySchema = PublicTerritorySchema.omit({ geometry: true }).openapi(
  'PublicTerritorySummary',
);
const SpatialSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    worldId: z.uuid(),
    paperWorldId: z.uuid(),
    dimension: z.string(),
    version: z.number().int().nonnegative(),
    integrity: z.string(),
    generatedAt: z.iso.datetime(),
    territories: z.array(PublicTerritorySchema),
  })
  .openapi('SpatialSnapshot');
type TerritorialApplicationSummary = z.infer<typeof TerritorialApplicationSummarySchema>;
type PublishedTerritoryRevision = z.infer<typeof PublishedTerritoryRevisionSchema>;
type TerritoryHistory = z.infer<typeof TerritoryHistorySchema>;
type TerritoryGeometry = z.infer<typeof TerritoryGeometrySchema>;
type SpatialWorld = z.infer<typeof SpatialWorldSchema>;
type SpatialWorldInput = z.infer<typeof SpatialWorldInputSchema>;
type TerritoryDraft = z.infer<typeof TerritoryDraftSchema>;
type TerritoryDraftInput = z.infer<typeof TerritoryDraftInputSchema>;
type SpatialAnalysis = z.infer<typeof SpatialAnalysisSchema>;
type TerritoryDirective = z.infer<typeof TerritoryDirectiveSchema>;
type TerritoryRevision = z.infer<typeof TerritoryRevisionSchema>;
type PublicTerritorySummary = z.infer<typeof PublicTerritorySummarySchema>;
type PublicTerritory = z.infer<typeof PublicTerritorySchema>;
type SpatialSnapshot = z.infer<typeof SpatialSnapshotSchema>;
export {
  SPATIAL_LIMITS,
  TerritoryHistorySchema,
  type PublishedTerritoryRevision,
  type TerritoryHistory,
  type TerritorialApplicationSummary,
  PositionSchema,
  TerritoryGeometrySchema,
  SpatialWorldInputSchema,
  SpatialWorldSchema,
  TerritorialChangeSchema,
  TerritoryDraftInputSchema,
  TerritoryDraftSchema,
  SpatialAnalysisSchema,
  TerritoryDecisionDisplaySchema,
  TerritoryDirectiveSchema,
  TerritoryRevisionSchema,
  PublicTerritorySchema,
  PublicTerritorySummarySchema,
  type PublicTerritorySummary,
  SpatialSnapshotSchema,
  type TerritoryGeometry,
  type SpatialWorld,
  type SpatialWorldInput,
  type TerritoryDraft,
  type TerritoryDraftInput,
  type SpatialAnalysis,
  type TerritoryDirective,
  type TerritoryRevision,
  type PublicTerritory,
  type SpatialSnapshot,
};
