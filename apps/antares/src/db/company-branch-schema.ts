import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './core-schema';
import { states } from './state-schema';
import { companies } from './company-identity-schema';
import { companyDecisions } from './company-governance-schema';
import { companyRegistrationPolicyRevisions } from './company-schema';
import { monetaryDirectives } from './monetary-schema';
import type { BranchStatus, BranchApplicationStatus } from '../modules/companies/branch-contracts';

const companyBranches = pgTable(
  'company_branches',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    status: text('status').$type<BranchStatus>().notNull(),
    currentApplicationId: uuid('current_application_id').notNull(),
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('company_branch_owner').on(table.companyId, table.status),
    index('company_branch_host').on(table.stateId, table.status),
    check(
      'company_branch_status',
      sql`${table.status} in ('PENDING_REGISTRATION','ACTIVE','REJECTED','CLOSED')`,
    ),
  ],
);
const companyBranchApplications = pgTable(
  'company_branch_applications',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => companyDecisions.id),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => companyBranches.id),
    policyRevisionId: uuid('policy_revision_id')
      .notNull()
      .references(() => companyRegistrationPolicyRevisions.id),
    status: text('status').$type<BranchApplicationStatus>().notNull(),
    reviewDirectiveId: uuid('review_directive_id')
      .unique()
      .references(() => monetaryDirectives.id),
    completionDecisionId: uuid('completion_decision_id')
      .unique()
      .references(() => companyDecisions.id),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewReason: text('review_reason'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
  },
  (table) => [
    uniqueIndex('company_branch_application_scope').on(table.id, table.branchId),
    index('company_branch_pending').on(table.status, table.createdAt),
    uniqueIndex('company_branch_one_pending')
      .on(table.branchId)
      .where(sql`${table.status} = 'PENDING'`),
    check(
      'company_branch_application_status',
      sql`${table.status} in ('PENDING','APPROVED','REJECTED','SUPERSEDED','CANCELLED')`,
    ),
  ],
);
const companyBranchEvents = pgTable(
  'company_branch_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => companyBranches.id),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => companyBranchApplications.id),
    fromStatus: text('from_status').$type<BranchStatus>(),
    toStatus: text('to_status').$type<BranchStatus>().notNull(),
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
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
  },
  (table) => [
    index('company_branch_history').on(table.branchId, table.createdAt),
    check(
      'company_branch_event_source',
      sql`num_nonnulls(${table.companyDecisionId}, ${table.stateDirectiveId}) = 1`,
    ),
    check(
      'company_branch_event_status',
      sql`(${table.fromStatus} is null or ${table.fromStatus} in ('PENDING_REGISTRATION','ACTIVE','REJECTED','CLOSED')) and ${table.toStatus} in ('PENDING_REGISTRATION','ACTIVE','REJECTED','CLOSED')`,
    ),
  ],
);
export { companyBranches, companyBranchApplications, companyBranchEvents };
