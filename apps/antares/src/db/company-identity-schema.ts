import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './core-schema';
import { localizedTexts, states } from './state-schema';
import type {
  CompanyRevisionContent,
  CompanyStatus,
  LegalOwner,
} from '../modules/companies/contracts';

const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    registrationStateId: uuid('registration_state_id').references(() => states.id),
    status: text('status').$type<CompanyStatus>().notNull().default('DRAFT'),
    currentRevisionId: uuid('current_revision_id'),
    currentApplicationId: uuid('current_application_id'),
    issuedShares: numeric('issued_shares', { precision: 38, scale: 0 }).notNull().default('0'),
    foundedAt: timestamp('founded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('company_registration_state').on(table.registrationStateId, table.status),
    check(
      'company_status_valid',
      sql`${table.status} in ('DRAFT','PENDING_REGISTRATION','ACTIVE','REJECTED','SUSPENDED','CLOSED')`,
    ),
    check(
      'company_issued_shares_range',
      sql`${table.issuedShares} >= 0 and ${table.issuedShares} < 1000000000000000000000000000000`,
    ),
  ],
);
const legalSubjects = pgTable(
  'legal_subjects',
  {
    id: uuid('id').primaryKey(),
    kind: text('kind').$type<LegalOwner['type']>().notNull(),
    playerId: uuid('player_id').references(() => users.id),
    stateId: uuid('state_id').references(() => states.id),
    companyId: uuid('company_id').references(() => companies.id),
  },
  (table) => [
    check(
      'legal_subject_identity',
      sql`num_nonnulls(${table.playerId}, ${table.stateId}, ${table.companyId}) = 1 and (
    (${table.kind} = 'PLAYER' and ${table.playerId} is not null and ${table.id} = ${table.playerId}) or
    (${table.kind} = 'STATE' and ${table.stateId} is not null and ${table.id} = ${table.stateId}) or
    (${table.kind} = 'COMPANY' and ${table.companyId} is not null and ${table.id} = ${table.companyId}))`,
    ),
  ],
);
const companyRevisions = pgTable(
  'company_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    number: integer('number').notNull(),
    previousRevisionId: uuid('previous_revision_id'),
    decisionId: uuid('decision_id').unique(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    content: jsonb('content').$type<CompanyRevisionContent>().notNull(),
    contentHash: text('content_hash').notNull(),
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('company_revision_number').on(table.companyId, table.number),
    uniqueIndex('company_revision_identity').on(table.id, table.companyId),
    check('company_revision_positive', sql`${table.number} > 0`),
  ],
);
const companyRevisionTexts = pgTable(
  'company_revision_texts',
  {
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => companyRevisions.id),
    path: text('path').notNull(),
    textId: uuid('text_id')
      .notNull()
      .references(() => localizedTexts.id),
  },
  (table) => [primaryKey({ columns: [table.revisionId, table.path] })],
);
const companyOffices = pgTable('company_offices', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
const companyOfficeHolders = pgTable(
  'company_office_holders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    officeId: uuid('office_id')
      .notNull()
      .references(() => companyOffices.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => companyRevisions.id),
    since: timestamp('since', { withTimezone: true }).notNull().defaultNow(),
    until: timestamp('until', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('company_holder_current')
      .on(table.officeId, table.userId)
      .where(sql`${table.until} is null`),
    check(
      'company_holder_interval',
      sql`${table.until} is null or ${table.until} >= ${table.since}`,
    ),
  ],
);
export {
  companies,
  legalSubjects,
  companyRevisions,
  companyRevisionTexts,
  companyOffices,
  companyOfficeHolders,
};
