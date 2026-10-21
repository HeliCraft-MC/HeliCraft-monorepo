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
import { localizedTexts } from './state-schema';
import { votings } from './voting-schema';
import {
  companies,
  companyRevisions,
  companyOffices,
  companyOfficeHolders,
} from './company-schema';
import type { CompanyDecisionPayload } from '../modules/companies/decision-contracts';

const companyDecisions = pgTable(
  'company_decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => companyRevisions.id),
    payload: jsonb('payload').$type<CompanyDecisionPayload>().notNull(),
    payloadHash: text('payload_hash').notNull(),
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    taxQuoteId: uuid('tax_quote_id').unique(),
    idempotencyKey: uuid('idempotency_key').notNull(),
    status: text('status')
      .$type<'PENDING' | 'APPLIED' | 'CANCELLED'>()
      .notNull()
      .default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    appliedBy: uuid('applied_by').references(() => users.id),
    manualReason: text('manual_reason'),
  },
  (table) => [
    uniqueIndex('company_decision_idempotency').on(table.createdBy, table.idempotencyKey),
    uniqueIndex('company_decision_identity').on(table.id, table.companyId),
    index('company_decision_history').on(table.companyId, table.createdAt),
    check('company_decision_status', sql`${table.status} in ('PENDING','APPLIED','CANCELLED')`),
  ],
);
const companyDecisionTexts = pgTable(
  'company_decision_texts',
  {
    decisionId: uuid('decision_id')
      .notNull()
      .references(() => companyDecisions.id),
    path: text('path').notNull(),
    textId: uuid('text_id')
      .notNull()
      .references(() => localizedTexts.id),
  },
  (table) => [primaryKey({ columns: [table.decisionId, table.path] })],
);
const companyDecisionApprovals = pgTable('company_decision_approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: uuid('decision_id')
    .notNull()
    .references(() => companyDecisions.id),
  officeId: uuid('office_id')
    .notNull()
    .references(() => companyOffices.id),
  holderId: uuid('holder_id')
    .notNull()
    .references(() => companyOfficeHolders.id),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
});
const companyApprovalRevocations = pgTable('company_approval_revocations', {
  approvalId: uuid('approval_id')
    .primaryKey()
    .references(() => companyDecisionApprovals.id),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
const companyDecisionVotes = pgTable(
  'company_decision_votes',
  {
    decisionId: uuid('decision_id')
      .notNull()
      .references(() => companyDecisions.id),
    requirementHash: text('requirement_hash').notNull(),
    votingId: uuid('voting_id')
      .notNull()
      .unique()
      .references(() => votings.id),
    approvalOptionId: uuid('approval_option_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.decisionId, table.requirementHash] })],
);
export {
  companyDecisions,
  companyDecisionTexts,
  companyDecisionApprovals,
  companyApprovalRevocations,
  companyDecisionVotes,
};
