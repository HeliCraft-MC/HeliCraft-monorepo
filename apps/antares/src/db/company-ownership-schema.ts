import { sql } from 'drizzle-orm';
import {
  check,
  index,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './core-schema';
import { companies, legalSubjects, companyRegistrationApplications } from './company-schema';
import { companyDecisions } from './company-governance-schema';
import { monetaryDirectives } from './monetary-schema';
import { companyShareOperations } from './company-share-consent-schema';

const companyShareBalances = pgTable(
  'company_share_balances',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => legalSubjects.id),
    shares: numeric('shares', { precision: 38, scale: 0 }).notNull().default('0'),
  },
  (table) => [
    primaryKey({ columns: [table.companyId, table.subjectId] }),
    index('company_share_owner').on(table.subjectId),
    check(
      'company_share_nonnegative',
      sql`${table.shares} >= 0 and ${table.shares} < 1000000000000000000000000000000`,
    ),
  ],
);
const companyShareEvents = pgTable(
  'company_share_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    kind: text('kind').$type<'INITIAL' | 'ISSUE' | 'TRANSFER'>().notNull(),
    shares: numeric('shares', { precision: 38, scale: 0 }).notNull(),
    operationId: uuid('operation_id')
      .unique()
      .references(() => companyShareOperations.id),
    fromSubjectId: uuid('from_subject_id').references(() => legalSubjects.id),
    toSubjectId: uuid('to_subject_id').references(() => legalSubjects.id),
    applicationId: uuid('application_id')
      .unique()
      .references(() => companyRegistrationApplications.id),
    decisionId: uuid('decision_id')
      .unique()
      .references(() => companyDecisions.id),
    authorizationDecisionId: uuid('authorization_decision_id')
      .unique()
      .references(() => companyDecisions.id),
    stateDirectiveId: uuid('state_directive_id')
      .unique()
      .references(() => monetaryDirectives.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    idempotencyKey: uuid('idempotency_key').notNull(),
    payloadHash: text('payload_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
  },
  (table) => [
    uniqueIndex('company_share_idempotency').on(table.actorId, table.idempotencyKey),
    uniqueIndex('company_share_event_identity').on(table.id, table.companyId),
    index('company_share_history').on(table.companyId, table.createdAt),
    check('company_share_event_kind', sql`${table.kind} in ('INITIAL','ISSUE','TRANSFER')`),
    check(
      'company_share_event_positive',
      sql`${table.shares} > 0 and ${table.shares} < 1000000000000000000000000000000`,
    ),
    check(
      'company_share_event_source',
      sql`(${table.kind} = 'INITIAL' and ${table.applicationId} is not null and ${table.decisionId} is null and ${table.fromSubjectId} is null and ${table.toSubjectId} is null) or
    (${table.kind} = 'ISSUE' and ${table.decisionId} is not null and ${table.applicationId} is null and ${table.fromSubjectId} is null and ${table.toSubjectId} is null) or
    (${table.kind} = 'TRANSFER' and ${table.applicationId} is null and ${table.fromSubjectId} is not null and ${table.toSubjectId} is not null and ${table.fromSubjectId} <> ${table.toSubjectId})`,
    ),
  ],
);
const companySharePostings = pgTable(
  'company_share_postings',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => companyShareEvents.id),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => legalSubjects.id),
    delta: numeric('delta', { precision: 38, scale: 0 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.subjectId] }),
    check('company_share_posting_nonzero', sql`${table.delta} <> 0`),
  ],
);
export { companyShareBalances, companyShareEvents, companySharePostings };
