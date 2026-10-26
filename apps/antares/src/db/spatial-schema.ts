import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  doublePrecision,
  uniqueIndex,
  index,
  primaryKey,
  check,
  customType,
} from 'drizzle-orm/pg-core';
import { users } from './core-schema';
import { states, localizedTexts } from './state-schema';
import { monetaryDirectives } from './monetary-schema';
import type { TerritoryGeometry, TerritoryDraftInput } from '../modules/spatial/contracts';

const DEFAULT_MAP_ZOOM = 3;
const DEFAULT_EXTRA_ZOOM = 2;
const planarGeometry = customType<{ data: string }>({ dataType: () => 'geometry(MultiPolygon,0)' });
const spatialWorlds = pgTable(
  'spatial_worlds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    logicalKey: text('logical_key').notNull().unique(),
    backendId: text('backend_id').notNull(),
    paperWorldId: uuid('paper_world_id').notNull(),
    dimension: text('dimension')
      .$type<'minecraft:overworld' | 'minecraft:the_nether' | 'minecraft:the_end'>()
      .notNull(),
    nameTextId: uuid('name_text_id')
      .notNull()
      .references(() => localizedTexts.id),
    tileKey: text('tile_key').notNull(),
    maxZoom: integer('max_zoom').notNull().default(DEFAULT_MAP_ZOOM),
    extraZoom: integer('extra_zoom').notNull().default(DEFAULT_EXTRA_ZOOM),
    status: text('status').$type<'ACTIVE' | 'RETIRED'>().notNull().default('ACTIVE'),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('spatial_world_paper_identity').on(table.backendId, table.paperWorldId),
    uniqueIndex('spatial_world_active_tiles')
      .on(table.backendId, table.tileKey)
      .where(sql`${table.status} = 'ACTIVE'`),
    check('spatial_world_status', sql`${table.status} in ('ACTIVE','RETIRED')`),
    check(
      'spatial_world_dimension',
      sql`${table.dimension} in ('minecraft:overworld','minecraft:the_nether','minecraft:the_end')`,
    ),
    check(
      'spatial_world_zoom',
      sql`${table.maxZoom} between 0 and 8 and ${table.extraZoom} between 0 and 4`,
    ),
  ],
);
const territoryDrafts = pgTable(
  'territory_drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    worldId: uuid('world_id')
      .notNull()
      .references(() => spatialWorlds.id),
    baseRevisionId: uuid('base_revision_id'),
    geometry: jsonb('geometry').$type<TerritoryGeometry>(),
    reasonTextId: uuid('reason_text_id')
      .notNull()
      .references(() => localizedTexts.id),
    change: text('change').$type<TerritoryDraftInput['change']>().notNull(),
    version: integer('version').notNull().default(1),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    sealedAt: timestamp('sealed_at', { withTimezone: true }),
    hash: text('hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('territory_draft_state').on(table.stateId, table.updatedAt),
    check('territory_draft_version', sql`${table.version} > 0`),
    check(
      'territory_draft_change',
      sql`${table.change} in ('INITIAL','EXPAND','REDUCE','RESHAPE')`,
    ),
    check(
      'territory_draft_seal',
      sql`(${table.sealedAt} is null and ${table.hash} is null) or (${table.sealedAt} is not null and ${table.hash} ~ '^[a-f0-9]{64}$' and ${table.geometry} is not null)`,
    ),
  ],
);
const territoryApplications = pgTable(
  'territory_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    draftId: uuid('draft_id')
      .notNull()
      .unique()
      .references(() => territoryDrafts.id),
    directiveId: uuid('directive_id')
      .notNull()
      .unique()
      .references(() => monetaryDirectives.id),
    status: text('status').$type<'REVIEW' | 'APPROVED' | 'REJECTED'>().notNull().default('REVIEW'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('territory_application_status', sql`${table.status} in ('REVIEW','APPROVED','REJECTED')`),
  ],
);
const territoryReviews = pgTable(
  'territory_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .unique()
      .references(() => territoryApplications.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    decision: text('decision').$type<'APPROVE' | 'REJECT'>().notNull(),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'territory_review_decision',
      sql`${table.decision} in ('APPROVE','REJECT') and length(trim(${table.reason})) between 1 and 2000`,
    ),
  ],
);
const territoryRevisions = pgTable(
  'territory_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    worldId: uuid('world_id')
      .notNull()
      .references(() => spatialWorlds.id),
    previousRevisionId: uuid('previous_revision_id'),
    number: integer('number').notNull(),
    applicationId: uuid('application_id')
      .notNull()
      .unique()
      .references(() => territoryApplications.id),
    geometry: jsonb('geometry').$type<TerritoryGeometry>().notNull(),
    geom: planarGeometry('geom').generatedAlwaysAs(
      sql`ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(geometry),0))`,
    ),
    area: doublePrecision('area').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    ratifiedBy: uuid('ratified_by')
      .notNull()
      .references(() => users.id),
    effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('territory_revision_number').on(table.stateId, table.worldId, table.number),
    index('territory_revision_world').on(table.worldId),
    check('territory_revision_number_positive', sql`${table.number} > 0`),
    check(
      'territory_revision_valid',
      sql`ST_IsValid(${table.geom}) and not ST_IsEmpty(${table.geom}) and ST_NPoints(${table.geom}) <= 4096 and ST_Area(${table.geom}) > 0 and ST_Area(${table.geom}) <= 1000000000 and ${table.area} = ST_Area(${table.geom})`,
    ),
  ],
);
const activeTerritories = pgTable(
  'active_territories',
  {
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    worldId: uuid('world_id')
      .notNull()
      .references(() => spatialWorlds.id),
    revisionId: uuid('revision_id')
      .notNull()
      .unique()
      .references(() => territoryRevisions.id),
  },
  (table) => [primaryKey({ columns: [table.stateId, table.worldId] })],
);
const territorialEvents = pgTable(
  'territorial_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    revisionId: uuid('revision_id')
      .notNull()
      .unique()
      .references(() => territoryRevisions.id),
    worldId: uuid('world_id')
      .notNull()
      .references(() => spatialWorlds.id),
    version: integer('version').notNull(),
    type: text('type').$type<'TERRITORY_PUBLISHED'>().notNull().default('TERRITORY_PUBLISHED'),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('territorial_event_version').on(table.worldId, table.version)],
);
export {
  spatialWorlds,
  territoryDrafts,
  territoryApplications,
  territoryReviews,
  territoryRevisions,
  activeTerritories,
  territorialEvents,
};
