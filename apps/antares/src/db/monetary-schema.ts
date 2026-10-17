import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  integer,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { users } from './core-schema';
import { states, stateGovernanceRevisions, stateOffices, localizedTexts } from './state-schema';
import { votings } from './voting-schema';
import type { DirectivePayload, MonetaryPolicy } from '../modules/monetary/contracts';

const monetaryDirectives = pgTable(
  'monetary_directives',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    governanceRevisionId: uuid('governance_revision_id')
      .notNull()
      .references(() => stateGovernanceRevisions.id),
    policyRevisionId: uuid('policy_revision_id'),
    payload: jsonb('payload').$type<DirectivePayload>().notNull(),
    nameTextId: uuid('name_text_id').references(() => localizedTexts.id),
    descriptionTextId: uuid('description_text_id').references(() => localizedTexts.id),
    payloadHash: text('payload_hash').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    idempotencyKey: uuid('idempotency_key').notNull(),
    status: text('status')
      .$type<'PENDING' | 'APPLIED' | 'CANCELLED'>()
      .notNull()
      .default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('monetary_directive_key').on(table.createdBy, table.idempotencyKey),
    index('monetary_directive_state').on(table.stateId, table.createdAt),
    check('monetary_directive_status', sql`${table.status} in ('PENDING','APPLIED','CANCELLED')`),
  ],
);
const monetaryApprovals = pgTable(
  'monetary_approvals',
  {
    directiveId: uuid('directive_id')
      .notNull()
      .references(() => monetaryDirectives.id),
    officeId: uuid('office_id')
      .notNull()
      .references(() => stateOffices.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.directiveId, table.officeId, table.actorId] })],
);
const monetaryVotes = pgTable('monetary_votes', {
  directiveId: uuid('directive_id')
    .primaryKey()
    .references(() => monetaryDirectives.id),
  votingId: uuid('voting_id')
    .notNull()
    .unique()
    .references(() => votings.id),
  approvalOptionId: uuid('approval_option_id').notNull(),
});
const centralBanks = pgTable(
  'central_banks',
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
    check(
      'central_bank_status',
      sql`${table.status} in ('PENDING','ACTIVE','REJECTED','SUSPENDED')`,
    ),
  ],
);
const bankReviews = pgTable('bank_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  bankId: uuid('bank_id')
    .notNull()
    .references(() => centralBanks.id),
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
const currencies = pgTable(
  'currencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stateId: uuid('state_id')
      .notNull()
      .unique()
      .references(() => states.id),
    bankId: uuid('bank_id')
      .notNull()
      .unique()
      .references(() => centralBanks.id),
    directiveId: uuid('directive_id')
      .notNull()
      .unique()
      .references(() => monetaryDirectives.id),
    code: text('code').notNull().unique(),
    status: text('status').$type<'ACTIVE' | 'BLOCKED'>().notNull().default('ACTIVE'),
    supplyMinor: numeric('supply_minor', { precision: 38, scale: 0 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'currency_supply',
      sql`${table.supplyMinor} >= 0 and ${table.supplyMinor} < 1000000000000000000000000000000`,
    ),
    check('currency_status', sql`${table.status} in ('ACTIVE','BLOCKED')`),
    check('currency_code', sql`${table.code} ~ '^[A-Z][A-Z0-9]{2,11}$'`),
  ],
);
const monetaryPolicyRevisions = pgTable(
  'monetary_policy_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id),
    directiveId: uuid('directive_id')
      .notNull()
      .unique()
      .references(() => monetaryDirectives.id),
    number: integer('number').notNull(),
    limits: jsonb('limits').$type<MonetaryPolicy>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('monetary_policy_currency').on(table.currencyId, table.createdAt),
    uniqueIndex('monetary_policy_number').on(table.currencyId, table.number),
    check('monetary_policy_number_positive', sql`${table.number} > 0`),
  ],
);
const financialAccounts = pgTable(
  'financial_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id),
    kind: text('kind').$type<'PLAYER' | 'CENTRAL_BANK' | 'TREASURY' | 'ISSUANCE'>().notNull(),
    ownerId: uuid('owner_id').notNull(),
    balanceMinor: numeric('balance_minor', { precision: 38, scale: 0 }).notNull().default('0'),
  },
  (table) => [
    uniqueIndex('financial_account_owner').on(table.currencyId, table.kind, table.ownerId),
    uniqueIndex('financial_account_currency').on(table.id, table.currencyId),
    check(
      'financial_account_kind',
      sql`${table.kind} in ('PLAYER','CENTRAL_BANK','TREASURY','ISSUANCE')`,
    ),
    check('financial_nonnegative', sql`${table.kind} = 'ISSUANCE' or ${table.balanceMinor} >= 0`),
  ],
);
const ledgerTransactions = pgTable(
  'ledger_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id),
    directiveId: uuid('directive_id')
      .unique()
      .references(() => monetaryDirectives.id),
    policyRevisionId: uuid('policy_revision_id').references(() => monetaryPolicyRevisions.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    idempotencyKey: uuid('idempotency_key').notNull(),
    payloadHash: text('payload_hash').notNull(),
    kind: text('kind').$type<'ISSUE' | 'BURN' | 'TRANSFER'>().notNull(),
    amountMinor: numeric('amount_minor', { precision: 38, scale: 0 }).notNull(),
    purpose: text('purpose').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
  },
  (table) => [
    uniqueIndex('ledger_idempotency').on(table.actorId, table.idempotencyKey),
    uniqueIndex('ledger_transaction_currency').on(table.id, table.currencyId),
    index('ledger_currency_time').on(table.currencyId, table.createdAt),
    check(
      'ledger_amount',
      sql`${table.amountMinor} > 0 and ${table.amountMinor} < 1000000000000000000000000000000`,
    ),
    check('ledger_kind', sql`${table.kind} in ('ISSUE','BURN','TRANSFER')`),
  ],
);
const ledgerPostings = pgTable(
  'ledger_postings',
  {
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => ledgerTransactions.id),
    accountId: uuid('account_id')
      .notNull()
      .references(() => financialAccounts.id),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id),
    deltaMinor: numeric('delta_minor', { precision: 38, scale: 0 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.transactionId, table.accountId] }),
    index('ledger_posting_account').on(table.accountId),
    check('ledger_nonzero', sql`${table.deltaMinor} <> 0`),
  ],
);
export {
  monetaryDirectives,
  monetaryApprovals,
  monetaryVotes,
  centralBanks,
  bankReviews,
  currencies,
  monetaryPolicyRevisions,
  financialAccounts,
  ledgerTransactions,
  ledgerPostings,
};
