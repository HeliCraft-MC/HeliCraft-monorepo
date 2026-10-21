import { sql } from 'drizzle-orm';
import { check, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { legalSubjects } from './company-identity-schema';
import { states } from './state-schema';
import { currencies } from './monetary-schema';
import { taxAssessments } from './taxation-schema';

const taxFractionalBalances = pgTable(
  'tax_fractional_balances',
  {
    key: text('key').primaryKey(),
    taxpayerId: uuid('taxpayer_id')
      .notNull()
      .references(() => legalSubjects.id),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id),
    obligationKey: text('obligation_key').notNull(),
    creditorStateId: uuid('creditor_state_id')
      .notNull()
      .references(() => states.id),
    beneficiaryKind: text('beneficiary_kind').$type<'TREASURY' | 'CENTRAL_BANK'>().notNull(),
    beneficiaryId: uuid('beneficiary_id').notNull(),
    remainder: numeric('remainder', { precision: 38, scale: 0 }).notNull().default('0'),
  },
  (table) => [
    uniqueIndex('tax_fractional_identity').on(
      table.taxpayerId,
      table.currencyId,
      table.obligationKey,
      table.creditorStateId,
      table.beneficiaryKind,
      table.beneficiaryId,
    ),
    check('tax_fractional_range', sql`${table.remainder} >= 0 and ${table.remainder} < 100000000`),
    check(
      'tax_fractional_beneficiary',
      sql`${table.beneficiaryKind} in ('TREASURY','CENTRAL_BANK')`,
    ),
  ],
);
const taxFractionalMovements = pgTable(
  'tax_fractional_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => taxAssessments.id),
    balanceKey: text('balance_key')
      .notNull()
      .references(() => taxFractionalBalances.key),
    exactNumerator: numeric('exact_numerator', { precision: 38, scale: 0 }).notNull(),
    remainderBefore: numeric('remainder_before', { precision: 38, scale: 0 }).notNull(),
    remainderAfter: numeric('remainder_after', { precision: 38, scale: 0 }).notNull(),
    collectedMinor: numeric('collected_minor', { precision: 38, scale: 0 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tax_fractional_assessment_once').on(table.assessmentId, table.balanceKey),
    check(
      'tax_fractional_movement_range',
      sql`${table.exactNumerator} >= 0 and ${table.remainderBefore} >= 0 and ${table.remainderBefore} < 100000000 and ${table.remainderAfter} >= 0 and ${table.remainderAfter} < 100000000 and ${table.collectedMinor} >= 0`,
    ),
    check(
      'tax_fractional_conservation',
      sql`${table.remainderBefore} + ${table.exactNumerator} = ${table.collectedMinor} * 100000000 + ${table.remainderAfter}`,
    ),
  ],
);
export { taxFractionalBalances, taxFractionalMovements };
