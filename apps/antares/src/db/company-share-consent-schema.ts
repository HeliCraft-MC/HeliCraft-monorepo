import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './core-schema';
import { companies, companyRevisions, legalSubjects } from './company-identity-schema';
import { companyDecisions } from './company-governance-schema';
import { monetaryDirectives } from './monetary-schema';
import type { ShareOperation } from '../modules/companies/ownership-contracts';

const companyShareOperations = pgTable(
  'company_share_operations',
  {
    id: uuid('id').primaryKey(),
    issuerId: uuid('issuer_id')
      .notNull()
      .references(() => companies.id),
    issuerRevisionId: uuid('issuer_revision_id')
      .notNull()
      .references(() => companyRevisions.id),
    terms: jsonb('terms').$type<ShareOperation>().notNull(),
    termsHash: text('terms_hash').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    idempotencyKey: uuid('idempotency_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('company_share_operation_command').on(table.createdBy, table.idempotencyKey),
    uniqueIndex('company_share_operation_identity').on(table.id, table.issuerId),
    index('company_share_operation_issuer').on(table.issuerId, table.createdAt),
  ],
);
const companyShareConsents = pgTable(
  'company_share_consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operationId: uuid('operation_id')
      .notNull()
      .references(() => companyShareOperations.id),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => legalSubjects.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    companyDecisionId: uuid('company_decision_id')
      .unique()
      .references(() => companyDecisions.id),
    stateDirectiveId: uuid('state_directive_id')
      .unique()
      .references(() => monetaryDirectives.id),
    idempotencyKey: uuid('idempotency_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('company_share_consent_command').on(table.actorId, table.idempotencyKey),
    index('company_share_consent_recipient').on(table.subjectId, table.operationId),
    check(
      'company_share_consent_one_source',
      sql`num_nonnulls(${table.companyDecisionId}, ${table.stateDirectiveId}) <= 1`,
    ),
  ],
);
const companyShareConsentRevocations = pgTable(
  'company_share_consent_revocations',
  {
    consentId: uuid('consent_id')
      .primaryKey()
      .references(() => companyShareConsents.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    companyDecisionId: uuid('company_decision_id')
      .unique()
      .references(() => companyDecisions.id),
    stateDirectiveId: uuid('state_directive_id')
      .unique()
      .references(() => monetaryDirectives.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'company_share_revocation_one_source',
      sql`num_nonnulls(${table.companyDecisionId}, ${table.stateDirectiveId}) <= 1`,
    ),
  ],
);
const companyShareAcceptances = pgTable(
  'company_share_acceptances',
  {
    eventId: uuid('event_id').notNull(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => legalSubjects.id),
    consentId: uuid('consent_id')
      .notNull()
      .unique()
      .references(() => companyShareConsents.id),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.subjectId] })],
);
export {
  companyShareOperations,
  companyShareConsents,
  companyShareConsentRevocations,
  companyShareAcceptances,
};
