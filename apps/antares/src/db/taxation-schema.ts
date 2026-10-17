import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  numeric,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { users } from './core-schema';
import { states, localizedTexts } from './state-schema';
import { monetaryDirectives, currencies, ledgerTransactions } from './monetary-schema';
import type { TaxRule, TaxCalculation, TaxCharge } from '../modules/taxation/contracts';

const economicDirectiveDocuments = pgTable('economic_directive_documents', {
  directiveId: uuid('directive_id')
    .primaryKey()
    .references(() => monetaryDirectives.id),
  textId: uuid('text_id')
    .notNull()
    .references(() => localizedTexts.id),
});
const taxOffices = pgTable(
  'tax_offices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stateId: uuid('state_id')
      .notNull()
      .unique()
      .references(() => states.id),
    establishmentDirectiveId: uuid('establishment_directive_id')
      .notNull()
      .unique()
      .references(() => monetaryDirectives.id),
    charterDirectiveId: uuid('charter_directive_id')
      .notNull()
      .references(() => monetaryDirectives.id),
    status: text('status')
      .$type<'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'>()
      .notNull()
      .default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('tax_office_status', sql`${table.status} in ('PENDING','ACTIVE','REJECTED','SUSPENDED')`),
  ],
);
const taxOfficeReviews = pgTable('tax_office_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  officeId: uuid('office_id')
    .notNull()
    .references(() => taxOffices.id),
  directiveId: uuid('directive_id')
    .notNull()
    .references(() => monetaryDirectives.id),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id),
  status: text('status').$type<'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'>().notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
const taxLaws = pgTable('tax_laws', {
  id: uuid('id').primaryKey(),
  stateId: uuid('state_id')
    .notNull()
    .references(() => states.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
const taxLawRevisions = pgTable(
  'tax_law_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lawId: uuid('law_id')
      .notNull()
      .references(() => taxLaws.id),
    directiveId: uuid('directive_id')
      .notNull()
      .unique()
      .references(() => monetaryDirectives.id),
    number: integer('number').notNull(),
    status: text('status').$type<'ACTIVE' | 'REPEALED'>().notNull(),
    rule: jsonb('rule').$type<TaxRule>().notNull(),
    nameTextId: uuid('name_text_id')
      .notNull()
      .references(() => localizedTexts.id),
    descriptionTextId: uuid('description_text_id')
      .notNull()
      .references(() => localizedTexts.id),
    documentTextId: uuid('document_text_id')
      .notNull()
      .references(() => localizedTexts.id),
    effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tax_law_revision_number').on(table.lawId, table.number),
    check('tax_law_revision_status', sql`${table.status} in ('ACTIVE','REPEALED')`),
    check('tax_law_rate', sql`(${table.rule}->>'rateBps')::integer between 0 and 10000`),
  ],
);
const transferQuotes = pgTable('transfer_quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id),
  commandHash: text('command_hash').notNull(),
  calculationHash: text('calculation_hash').notNull(),
  calculation: jsonb('calculation').$type<TaxCalculation>().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
const economicOperations = pgTable(
  'economic_operations',
  {
    id: uuid('id').primaryKey(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id),
    idempotencyKey: uuid('idempotency_key').notNull(),
    commandHash: text('command_hash').notNull(),
    quoteId: uuid('quote_id').references(() => transferQuotes.id),
    event: text('event').$type<'PLAYER_TRANSFER'>().notNull(),
    calculation: jsonb('calculation').$type<TaxCalculation>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
  },
  (table) => [
    uniqueIndex('economic_operation_idempotency').on(table.actorId, table.idempotencyKey),
  ],
);
const taxAssessments = pgTable(
  'tax_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operationId: uuid('operation_id')
      .notNull()
      .references(() => economicOperations.id),
    assessmentKey: text('assessment_key').notNull(),
    taxpayerId: uuid('taxpayer_id')
      .notNull()
      .references(() => users.id),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id),
    baseMinor: numeric('base_minor', { precision: 38, scale: 0 }).notNull(),
    charge: jsonb('charge').$type<TaxCharge>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('tax_assessment_once').on(table.operationId, table.assessmentKey)],
);
const taxAssessmentClaims = pgTable(
  'tax_assessment_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => taxAssessments.id),
    operationId: uuid('operation_id')
      .notNull()
      .references(() => economicOperations.id),
    lawId: uuid('law_id')
      .notNull()
      .references(() => taxLaws.id),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => taxLawRevisions.id),
  },
  (table) => [uniqueIndex('tax_law_once_per_event').on(table.operationId, table.lawId)],
);
const economicJournals = pgTable('economic_journals', {
  journalId: uuid('journal_id')
    .primaryKey()
    .references(() => ledgerTransactions.id),
  operationId: uuid('operation_id')
    .notNull()
    .references(() => economicOperations.id),
  assessmentId: uuid('assessment_id').references(() => taxAssessments.id),
  creditorStateId: uuid('creditor_state_id').references(() => states.id),
});
export {
  economicDirectiveDocuments,
  taxOffices,
  taxOfficeReviews,
  taxLaws,
  taxLawRevisions,
  transferQuotes,
  economicOperations,
  taxAssessments,
  taxAssessmentClaims,
  economicJournals,
};
