import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies, legalSubjects, companyRevisions } from './company-identity-schema';
import { users } from './core-schema';
import { states } from './state-schema';
import { monetaryDirectives, ledgerTransactions } from './monetary-schema';
import type {
  CompanyConfiguration,
  CompanyRegistrationPolicy,
  CompanyStatus,
} from '../modules/companies/contracts';

const companyDrafts = pgTable(
  'company_drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull().default(''),
    version: integer('version').notNull().default(1),
    step: integer('step').notNull().default(0),
    configuration: jsonb('configuration').$type<CompanyConfiguration>().notNull(),
    submittedApplicationId: uuid('submitted_application_id'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('company_draft_owner').on(table.ownerId, table.updatedAt),
    uniqueIndex('company_one_open_draft')
      .on(table.companyId)
      .where(sql`${table.deletedAt} is null and ${table.submittedApplicationId} is null`),
    check('company_draft_version', sql`${table.version} > 0 and ${table.step} >= 0`),
  ],
);
const companyRegistrationPolicyRevisions = pgTable(
  'company_registration_policy_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    number: integer('number').notNull(),
    previousRevisionId: uuid('previous_revision_id'),
    directiveId: uuid('directive_id')
      .notNull()
      .unique()
      .references(() => monetaryDirectives.id),
    policy: jsonb('policy').$type<CompanyRegistrationPolicy>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('company_registration_policy_number').on(table.stateId, table.number),
    check('company_registration_policy_positive', sql`${table.number} > 0`),
  ],
);
const companyRegistrationApplications = pgTable(
  'company_registration_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => companyRevisions.id),
    policyRevisionId: uuid('policy_revision_id')
      .notNull()
      .references(() => companyRegistrationPolicyRevisions.id),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    applicantId: uuid('applicant_id')
      .notNull()
      .references(() => users.id),
    idempotencyKey: uuid('idempotency_key').notNull(),
    commandHash: text('command_hash').notNull(),
    feeJournalId: uuid('fee_journal_id')
      .unique()
      .references(() => ledgerTransactions.id),
    draftId: uuid('draft_id')
      .notNull()
      .unique()
      .references(() => companyDrafts.id),
    formationHash: text('formation_hash').notNull(),
    totalShares: numeric('total_shares', { precision: 38, scale: 0 }).notNull(),
    allocations: jsonb('allocations').$type<CompanyConfiguration['allocations']>().notNull(),
    status: text('status')
      .$type<'PENDING' | 'APPROVED' | 'REJECTED'>()
      .notNull()
      .default('PENDING'),
    reviewDirectiveId: uuid('review_directive_id')
      .unique()
      .references(() => monetaryDirectives.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('company_application_identity').on(table.id, table.companyId),
    uniqueIndex('company_application_command').on(table.applicantId, table.idempotencyKey),
    index('company_application_review').on(table.stateId, table.status),
    check('company_application_status', sql`${table.status} in ('PENDING','APPROVED','REJECTED')`),
    check(
      'company_application_shares_positive',
      sql`${table.totalShares} > 0 and ${table.totalShares} < 1000000000000000000000000000000`,
    ),
  ],
);
const companyFormationConsents = pgTable(
  'company_formation_consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    formationHash: text('formation_hash').notNull(),
    role: text('role').$type<'FOUNDER' | 'OFFICE_HOLDER'>().notNull(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => legalSubjects.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    companyDecisionId: uuid('company_decision_id'),
    stateDirectiveId: uuid('state_directive_id').references(() => monetaryDirectives.id),
    idempotencyKey: uuid('idempotency_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('company_consent_idempotency').on(table.actorId, table.idempotencyKey),
    check('company_consent_role', sql`${table.role} in ('FOUNDER','OFFICE_HOLDER')`),
  ],
);
const companyConsentRevocations = pgTable('company_consent_revocations', {
  consentId: uuid('consent_id')
    .primaryKey()
    .references(() => companyFormationConsents.id),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
const companyStatusHistory = pgTable(
  'company_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: integer('number').notNull().default(1),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    previousStatus: text('previous_status').$type<CompanyStatus>().notNull(),
    status: text('status').$type<CompanyStatus>().notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    reason: text('reason').notNull(),
    applicationId: uuid('application_id').references(() => companyRegistrationApplications.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('company_status_number').on(table.companyId, table.number)],
);
export {
  companyDrafts,
  companyRegistrationPolicyRevisions,
  companyRegistrationApplications,
  companyFormationConsents,
  companyConsentRevocations,
  companyStatusHistory,
};
export {
  companies,
  legalSubjects,
  companyRevisions,
  companyRevisionTexts,
  companyOffices,
  companyOfficeHolders,
} from './company-identity-schema';
