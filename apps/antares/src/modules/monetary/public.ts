import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import type { z } from '@hono/zod-openapi';
import { centralBanks, currencies, ledgerTransactions, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { readRevision } from '../states/revisions';
import type { PublicCurrencySchema } from './contracts';
import type { CurrencyRecord } from './store';
import { bankDto, currencyDto, HISTORY_LIMIT } from './read-models';

// oxlint-disable-next-line max-lines-per-function -- The allowlisted public DTO excludes private state content, reviews and account history.
async function publicCurrencyDto(
  transaction: Transaction,
  currency: CurrencyRecord,
  page = 1,
): Promise<z.infer<typeof PublicCurrencySchema>> {
  const [state] = await transaction.select().from(states).where(eq(states.id, currency.stateId));
  const [bank] = await transaction
    .select()
    .from(centralBanks)
    .where(eq(centralBanks.id, currency.bankId));
  if (!state || !bank) {
    throw new Error('Missing currency institution');
  }
  const active = state.status === 'ACTIVE';
  const revision =
    active && state.currentRevisionId !== null
      ? await readRevision(transaction, state.currentRevisionId)
      : null;
  const bankData = await bankDto(transaction, bank);
  const issuance = await transaction
    .select()
    .from(ledgerTransactions)
    .where(
      and(
        eq(ledgerTransactions.currencyId, currency.id),
        inArray(ledgerTransactions.kind, ['ISSUE', 'BURN']),
      ),
    )
    .orderBy(desc(ledgerTransactions.createdAt), desc(ledgerTransactions.id))
    .limit(HISTORY_LIMIT + 1)
    .offset((page - 1) * HISTORY_LIMIT);
  return {
    currency: await currencyDto(transaction, currency),
    bank: {
      id: bankData.id,
      stateId: bankData.stateId,
      name: bankData.name,
      description: bankData.description,
      status: bankData.status,
      charterDirectiveId: bankData.charterDirectiveId,
      establishmentDirectiveId: bankData.establishmentDirectiveId,
      createdAt: bankData.createdAt,
    },
    state: {
      id: state.id,
      slug: revision === null ? null : state.slug,
      name: revision?.configuration.name ?? null,
      active,
    },
    issuancePage: page,
    hasMoreIssuance: issuance.length > HISTORY_LIMIT,
    issuance: issuance.slice(0, HISTORY_LIMIT).map((entry) => ({
      id: entry.id,
      kind: entry.kind === 'ISSUE' ? 'ISSUE' : 'BURN',
      amountMinor: entry.amountMinor,
      policyRevisionId: entry.policyRevisionId,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}
async function publicCurrencyRecords(
  transaction: Transaction,
  input: Readonly<{ code?: string; after?: string }>,
): Promise<CurrencyRecord[]> {
  const filter = input.code === undefined ? undefined : eq(currencies.code, input.code);
  return await transaction
    .select()
    .from(currencies)
    .where(and(filter, input.after === undefined ? undefined : gt(currencies.code, input.after)))
    .orderBy(currencies.code)
    .limit(HISTORY_LIMIT + 1);
}
export { publicCurrencyDto, publicCurrencyRecords };
