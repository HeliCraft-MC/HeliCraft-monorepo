import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core';
import { states, localizedTexts } from './state-schema';
import { users } from './core-schema';
import { monetaryDirectives } from './monetary-schema';
import type { TreatyContent } from '../modules/diplomacy/contracts';

const treaties = pgTable(
  'treaties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').$type<'TAX_TREATY'>().notNull().default('TAX_TREATY'),
    proposerStateId: uuid('proposer_state_id')
      .notNull()
      .references(() => states.id),
    currentRevisionId: uuid('current_revision_id').notNull(),
    activeRevisionId: uuid('active_revision_id'),
    status: text('status')
      .$type<'DRAFT' | 'PROPOSED' | 'ACTIVE' | 'REJECTED' | 'TERMINATED'>()
      .notNull()
      .default('DRAFT'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'treaty_status',
      sql`${table.status} in ('DRAFT','PROPOSED','ACTIVE','REJECTED','TERMINATED')`,
    ),
  ],
);
const treatyParties = pgTable(
  'treaty_parties',
  {
    treatyId: uuid('treaty_id')
      .notNull()
      .references(() => treaties.id),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    position: integer('position').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.treatyId, table.stateId] }),
    uniqueIndex('treaty_party_position').on(table.treatyId, table.position),
    check('treaty_bilateral_position', sql`${table.position} in (0,1)`),
  ],
);
const treatyRevisions = pgTable(
  'treaty_revisions',
  {
    id: uuid('id').primaryKey(),
    treatyId: uuid('treaty_id')
      .notNull()
      .references(() => treaties.id),
    number: integer('number').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    content: jsonb('content').$type<TreatyContent>().notNull(),
    contentHash: text('content_hash').notNull(),
    nameTextId: uuid('name_text_id')
      .notNull()
      .references(() => localizedTexts.id),
    descriptionTextId: uuid('description_text_id')
      .notNull()
      .references(() => localizedTexts.id),
    documentTextId: uuid('document_text_id')
      .notNull()
      .references(() => localizedTexts.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('treaty_revision_number').on(table.treatyId, table.number)],
);
const treatyDecisions = pgTable('treaty_decisions', {
  directiveId: uuid('directive_id')
    .primaryKey()
    .references(() => monetaryDirectives.id),
  revisionId: uuid('revision_id')
    .notNull()
    .references(() => treatyRevisions.id),
  stateId: uuid('state_id')
    .notNull()
    .references(() => states.id),
  kind: text('kind')
    .$type<'RATIFY_TREATY' | 'AMEND_TREATY' | 'DENOUNCE_TREATY' | 'REJECT_TREATY'>()
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
const treatyActivations = pgTable('treaty_activations', {
  revisionId: uuid('revision_id')
    .primaryKey()
    .references(() => treatyRevisions.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export { treaties, treatyParties, treatyRevisions, treatyDecisions, treatyActivations };
