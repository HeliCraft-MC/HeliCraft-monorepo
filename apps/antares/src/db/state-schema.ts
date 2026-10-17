// oxlint-disable max-lines -- Cohesive domain contract or composed editor; validation, persistence and individual controls are separate modules.
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users, galleryImages } from './core-schema';
import type { StateConfiguration, StateStatus } from '../modules/states/contracts';

const time = (name: string): ReturnType<typeof timestamp> =>
  timestamp(name, { withTimezone: true });
// Localized text records are append-only once referenced by a published revision.
const localizedTexts = pgTable('localized_texts', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: time('created_at').notNull().defaultNow(),
});
const localizedTextValues = pgTable(
  'localized_text_values',
  {
    textId: uuid('text_id')
      .notNull()
      .references(() => localizedTexts.id, { onDelete: 'restrict' }),
    locale: text('locale').notNull(),
    value: text('value').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.textId, table.locale] }),
    check('localized_supported_locale', sql`${table.locale} in ('ru', 'en')`),
  ],
);
const states = pgTable(
  'states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    status: text('status').$type<StateStatus>().notNull().default('CREATED'),
    statusReason: text('status_reason'),
    currentRevisionId: uuid('current_revision_id'),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (table) => [
    check(
      'state_status_valid',
      sql`${table.status} in ('CREATED','ACTIVE','SUSPENDED','REJECTED','DORMANT','DISSOLVED')`,
    ),
  ],
);
const stateDrafts = pgTable(
  'state_creation_drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    stateId: uuid('state_id').references(() => states.id),
    baseRevisionId: uuid('base_revision_id'),
    title: text('title').notNull().default(''),
    version: integer('version').notNull().default(1),
    step: integer('step').notNull().default(0),
    configuration: jsonb('configuration').$type<StateConfiguration>().notNull(),
    updatedAt: time('updated_at').notNull().defaultNow(),
    submittedStateId: uuid('submitted_state_id').references(() => states.id),
    deletedAt: time('deleted_at'),
  },
  (table) => [index('state_draft_owner').on(table.ownerId)],
);
const stateFounders = pgTable(
  'state_founders',
  {
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: text('founder_type').$type<'PRIMARY' | 'COFOUNDER'>().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.stateId, table.userId] }),
    uniqueIndex('state_primary_founder')
      .on(table.stateId)
      .where(sql`${table.type} = 'PRIMARY'`),
  ],
);
const stateMemberships = pgTable(
  'state_memberships',
  {
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: text('citizenship_type').$type<'FULL_CITIZEN'>().notNull().default('FULL_CITIZEN'),
    joinedAt: time('joined_at').notNull().defaultNow(),
    endedAt: time('ended_at'),
  },
  (table) => [primaryKey({ columns: [table.stateId, table.userId] })],
);
const stateGovernanceRevisions = pgTable(
  'state_governance_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    number: integer('number').notNull(),
    previousRevisionId: uuid('previous_revision_id'),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    adminOverride: boolean('admin_override').notNull().default(false),
    reason: text('reason'),
    // Display texts are stripped from this machine snapshot and stored in normalized text references.
    configuration: jsonb('configuration').$type<StateConfiguration>().notNull(),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('state_revision_number').on(table.stateId, table.number)],
);
const stateRevisionTexts = pgTable(
  'state_revision_texts',
  {
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => stateGovernanceRevisions.id),
    path: text('path').notNull(),
    textId: uuid('text_id')
      .notNull()
      .references(() => localizedTexts.id),
  },
  (table) => [primaryKey({ columns: [table.revisionId, table.path] })],
);
const stateOffices = pgTable('state_offices', {
  id: uuid('id').primaryKey(),
  stateId: uuid('state_id')
    .notNull()
    .references(() => states.id),
  createdAt: time('created_at').notNull().defaultNow(),
});
const stateOfficeRevisionData = pgTable(
  'state_office_revision_data',
  {
    officeId: uuid('office_id')
      .notNull()
      .references(() => stateOffices.id),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => stateGovernanceRevisions.id),
    position: integer('position').notNull(),
  },
  (table) => [primaryKey({ columns: [table.officeId, table.revisionId] })],
);
const stateOfficeHolders = pgTable(
  'state_office_holders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    officeId: uuid('office_id')
      .notNull()
      .references(() => stateOffices.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    since: time('since').notNull().defaultNow(),
    until: time('until'),
  },
  (table) => [
    uniqueIndex('office_active_holder')
      .on(table.officeId, table.userId)
      .where(sql`${table.until} is null`),
  ],
);
const stateConstitutionRevisions = pgTable('state_constitution_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  stateId: uuid('state_id')
    .notNull()
    .references(() => states.id),
  governanceRevisionId: uuid('governance_revision_id')
    .notNull()
    .unique()
    .references(() => stateGovernanceRevisions.id),
  titleTextId: uuid('title_text_id')
    .notNull()
    .references(() => localizedTexts.id),
  createdAt: time('created_at').notNull().defaultNow(),
});
const stateConstitutionBlocks = pgTable(
  'state_constitution_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    constitutionRevisionId: uuid('constitution_revision_id')
      .notNull()
      .references(() => stateConstitutionRevisions.id),
    position: integer('position').notNull(),
    blockKey: uuid('block_key').notNull(),
    contentTextId: uuid('content_text_id').references(() => localizedTexts.id),
    descriptor: jsonb('descriptor')
      .$type<Extract<StateConfiguration['constitution'], object>['blocks'][number]>()
      .notNull(),
  },
  (table) => [
    uniqueIndex('constitution_block_position').on(table.constitutionRevisionId, table.position),
  ],
);
const stateMedia = pgTable('state_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  storageKey: text('storage_key').notNull().unique(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: time('created_at').notNull().defaultNow(),
});
const stateReformApprovals = pgTable(
  'state_reform_approvals',
  {
    draftId: uuid('draft_id')
      .notNull()
      .references(() => stateDrafts.id),
    version: integer('version').notNull(),
    officeId: uuid('office_id')
      .notNull()
      .references(() => stateOffices.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.draftId, table.version, table.officeId] })],
);
const stateReformVotes = pgTable(
  'state_reform_votes',
  {
    draftId: uuid('draft_id')
      .notNull()
      .references(() => stateDrafts.id),
    version: integer('version').notNull(),
    votingId: uuid('voting_id').notNull(),
    approvalOptionId: uuid('approval_option_id').notNull(),
    configuration: jsonb('configuration').$type<StateConfiguration>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.draftId, table.version] })],
);

const stateReformProposals = pgTable(
  'state_reform_proposals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    draftId: uuid('draft_id')
      .notNull()
      .references(() => stateDrafts.id),
    version: integer('version').notNull(),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    baseRevisionId: uuid('base_revision_id')
      .notNull()
      .references(() => stateGovernanceRevisions.id),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    configurationHash: text('configuration_hash').notNull(),
    configuration: jsonb('configuration').$type<StateConfiguration>().notNull(),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('reform_proposal_draft_version').on(table.draftId, table.version)],
);
const stateReformProposalTexts = pgTable(
  'state_reform_proposal_texts',
  {
    proposalId: uuid('proposal_id')
      .notNull()
      .references(() => stateReformProposals.id),
    path: text('path').notNull(),
    textId: uuid('text_id')
      .notNull()
      .references(() => localizedTexts.id),
  },
  (table) => [primaryKey({ columns: [table.proposalId, table.path] })],
);
const galleryStateLinks = pgTable(
  'gallery_state_links',
  {
    imageId: uuid('image_id')
      .notNull()
      .references(() => galleryImages.id),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    role: text('role').$type<'LOCATION' | 'PARTICIPANT' | 'RELATED'>().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.imageId, table.stateId, table.role] }),
    check('gallery_state_role', sql`${table.role} in ('LOCATION', 'PARTICIPANT', 'RELATED')`),
  ],
);
export {
  localizedTexts,
  localizedTextValues,
  states,
  stateDrafts,
  stateFounders,
  stateMemberships,
  stateGovernanceRevisions,
  stateRevisionTexts,
  stateOffices,
  stateOfficeRevisionData,
  stateOfficeHolders,
  stateConstitutionRevisions,
  stateConstitutionBlocks,
  stateMedia,
  galleryStateLinks,
  stateReformApprovals,
  stateReformVotes,
  stateReformProposals,
  stateReformProposalTexts,
};
