import { sql } from 'drizzle-orm';
import {
  check,
  index,
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
import { states } from './state-schema';
import {
  centralBanks,
  currencies,
  ledgerTransactions,
  monetaryDirectives,
} from './monetary-schema';
import type { FxOfferTerms, InterbankTerms } from '../modules/fx/contracts';

const fxOffers = pgTable(
  'fx_offers',
  {
    id: uuid('id').primaryKey(),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    bankId: uuid('bank_id')
      .notNull()
      .references(() => centralBanks.id),
    publishDirectiveId: uuid('publish_directive_id')
      .notNull()
      .unique()
      .references(() => monetaryDirectives.id),
    terms: jsonb('terms').$type<FxOfferTerms>().notNull(),
    termsHash: text('terms_hash').notNull(),
    receiveCurrencyId: uuid('receive_currency_id')
      .notNull()
      .references(() => currencies.id),
    provideCurrencyId: uuid('provide_currency_id')
      .notNull()
      .references(() => currencies.id),
    providePerLotMinor: numeric('provide_per_lot_minor', { precision: 38, scale: 0 }).notNull(),
    remainingLots: numeric('remaining_lots', { precision: 38, scale: 0 }).notNull(),
    status: text('status')
      .$type<'ACTIVE' | 'FILLED' | 'CANCELLED' | 'EXPIRED'>()
      .notNull()
      .default('ACTIVE'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
  },
  (table) => [
    index('fx_offer_reserve').on(table.bankId, table.provideCurrencyId, table.status),
    check('fx_offer_status', sql`${table.status} in ('ACTIVE','FILLED','CANCELLED','EXPIRED')`),
    check(
      'fx_offer_different_currencies',
      sql`${table.receiveCurrencyId} <> ${table.provideCurrencyId}`,
    ),
    check(
      'fx_offer_remaining',
      sql`${table.remainingLots} >= 0 and ${table.remainingLots} < 1000000000000000000000000000000`,
    ),
    check(
      'fx_offer_positive_lot',
      sql`${table.providePerLotMinor} > 0 and ${table.providePerLotMinor} < 1000000000000000000000000000000`,
    ),
  ],
);
const fxInterbankTrades = pgTable(
  'fx_interbank_trades',
  {
    id: uuid('id').primaryKey(),
    terms: jsonb('terms').$type<InterbankTerms>().notNull(),
    termsHash: text('terms_hash').notNull(),
    firstStateId: uuid('first_state_id')
      .notNull()
      .references(() => states.id),
    secondStateId: uuid('second_state_id')
      .notNull()
      .references(() => states.id),
    status: text('status').$type<'PENDING' | 'SETTLED'>().notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('fx_trade_parties', sql`${table.firstStateId} <> ${table.secondStateId}`),
    check('fx_trade_status', sql`${table.status} in ('PENDING','SETTLED')`),
  ],
);
const fxInterbankApprovals = pgTable('fx_interbank_approvals', {
  directiveId: uuid('directive_id')
    .primaryKey()
    .references(() => monetaryDirectives.id),
  tradeId: uuid('trade_id')
    .notNull()
    .references(() => fxInterbankTrades.id),
  stateId: uuid('state_id')
    .notNull()
    .references(() => states.id),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id),
  databaseTransaction: text('database_transaction')
    .notNull()
    .default(sql`pg_current_xact_id()::text`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
const fxQuotes = pgTable('fx_quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  offerId: uuid('offer_id')
    .notNull()
    .references(() => fxOffers.id),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id),
  termsHash: text('terms_hash').notNull(),
  lots: numeric('lots', { precision: 38, scale: 0 }).notNull(),
  receiveMinor: numeric('receive_minor', { precision: 38, scale: 0 }).notNull(),
  provideMinor: numeric('provide_minor', { precision: 38, scale: 0 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
const fxExchanges = pgTable(
  'fx_exchanges',
  {
    id: uuid('id').primaryKey(),
    event: text('event').$type<'FX_EXCHANGE'>().notNull().default('FX_EXCHANGE'),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    idempotencyKey: uuid('idempotency_key').notNull(),
    commandHash: text('command_hash').notNull(),
    offerId: uuid('offer_id').references(() => fxOffers.id),
    tradeId: uuid('trade_id')
      .unique()
      .references(() => fxInterbankTrades.id),
    quoteId: uuid('quote_id')
      .unique()
      .references(() => fxQuotes.id),
    firstApprovalId: uuid('first_approval_id').references(() => fxInterbankApprovals.directiveId),
    secondApprovalId: uuid('second_approval_id').references(() => fxInterbankApprovals.directiveId),
    receiveCurrencyId: uuid('receive_currency_id')
      .notNull()
      .references(() => currencies.id),
    provideCurrencyId: uuid('provide_currency_id')
      .notNull()
      .references(() => currencies.id),
    receiveMinor: numeric('receive_minor', { precision: 38, scale: 0 }).notNull(),
    provideMinor: numeric('provide_minor', { precision: 38, scale: 0 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
  },
  (table) => [
    uniqueIndex('fx_exchange_idempotency').on(table.actorId, table.idempotencyKey),
    check(
      'fx_exchange_context',
      sql`${table.event} = 'FX_EXCHANGE' and ${table.receiveCurrencyId} <> ${table.provideCurrencyId} and ${table.receiveMinor} > 0 and ${table.provideMinor} > 0 and ((${table.offerId} is not null and ${table.quoteId} is not null and ${table.tradeId} is null) or (${table.offerId} is null and ${table.quoteId} is null and ${table.tradeId} is not null))`,
    ),
  ],
);
const fxExchangeJournals = pgTable(
  'fx_exchange_journals',
  {
    exchangeId: uuid('exchange_id')
      .notNull()
      .references(() => fxExchanges.id),
    leg: text('leg').$type<'RECEIVE' | 'PROVIDE'>().notNull(),
    journalId: uuid('journal_id')
      .notNull()
      .unique()
      .references(() => ledgerTransactions.id),
  },
  (table) => [
    primaryKey({ columns: [table.exchangeId, table.leg] }),
    check('fx_journal_leg', sql`${table.leg} in ('RECEIVE','PROVIDE')`),
  ],
);
const fxOfferEvents = pgTable(
  'fx_offer_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => fxOffers.id),
    kind: text('kind').$type<'PUBLISH' | 'FILL' | 'CANCEL' | 'EXPIRE'>().notNull(),
    remainingBefore: numeric('remaining_before', { precision: 38, scale: 0 }).notNull(),
    remainingAfter: numeric('remaining_after', { precision: 38, scale: 0 }).notNull(),
    directiveId: uuid('directive_id')
      .unique()
      .references(() => monetaryDirectives.id),
    exchangeId: uuid('exchange_id')
      .unique()
      .references(() => fxExchanges.id),
    actorId: uuid('actor_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    databaseTransaction: text('database_transaction')
      .notNull()
      .default(sql`pg_current_xact_id()::text`),
  },
  (table) => [
    uniqueIndex('fx_offer_one_atomic_transition').on(table.offerId, table.databaseTransaction),
    check('fx_offer_event_kind', sql`${table.kind} in ('PUBLISH','FILL','CANCEL','EXPIRE')`),
  ],
);
export {
  fxOffers,
  fxInterbankTrades,
  fxInterbankApprovals,
  fxQuotes,
  fxExchanges,
  fxExchangeJournals,
  fxOfferEvents,
};
