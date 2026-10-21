// oxlint-disable no-await-in-loop -- Localized immutable records hydrate in order on one transaction connection.
import { and, desc, eq, inArray, or } from 'drizzle-orm';
import type { centralBanks } from '../../db/schema';
import {
  economicJournals,
  economicOperations,
  bankReviews,
  financialAccounts,
  ledgerTransactions,
  ledgerPostings,
  monetaryDirectives,
  companyDecisions,
  currencies,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { Account, Bank, Currency, LedgerTransaction } from './contracts';
import { monetaryStatistics } from './statistics';
import { currentPolicy, directiveRecord, hydratePayload } from './store';
import { bankReservedMinor } from '../fx/reserves';

const HISTORY_LIMIT = 50;
function accountDto(record: typeof financialAccounts.$inferSelect): Account {
  return {
    id: record.id,
    currencyId: record.currencyId,
    kind: record.kind,
    ownerId: record.ownerId,
    balanceMinor: record.balanceMinor,
  };
}
async function bankDto(
  transaction: Transaction,
  record: typeof centralBanks.$inferSelect,
): Promise<Bank> {
  const payload = await hydratePayload(
    transaction,
    await directiveRecord(transaction, record.charterDirectiveId),
  );
  if (!('name' in payload)) {
    throw new Error('Missing bank charter');
  }
  const reviews = await transaction
    .select()
    .from(bankReviews)
    .where(eq(bankReviews.bankId, record.id))
    .orderBy(desc(bankReviews.createdAt));
  return {
    id: record.id,
    stateId: record.stateId,
    status: record.status,
    charterDirectiveId: record.charterDirectiveId,
    establishmentDirectiveId: record.establishmentDirectiveId,
    name: payload.name,
    description: payload.description,
    createdAt: record.createdAt.toISOString(),
    reviews: reviews.map((review) => ({
      id: review.id,
      actorId: review.actorId,
      status: review.status,
      reason: review.reason,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}
async function currencyDto(
  transaction: Transaction,
  record: typeof currencies.$inferSelect,
): Promise<Currency> {
  const payload = await hydratePayload(
    transaction,
    await directiveRecord(transaction, record.directiveId),
  );
  if (payload.kind !== 'CREATE_CURRENCY') {
    throw new Error('Missing currency decision');
  }
  const policy = await currentPolicy(transaction, record.id);
  return {
    id: record.id,
    stateId: record.stateId,
    bankId: record.bankId,
    code: record.code,
    precision: 2,
    status: record.status,
    name: payload.name,
    description: payload.description,
    supplyMinor: record.supplyMinor,
    createdAt: record.createdAt.toISOString(),
    ...(await monetaryStatistics(transaction, record, policy)),
  };
}
async function heldCurrencyDtos(
  transaction: Transaction,
  currencyIds: readonly string[],
): Promise<Currency[]> {
  const ids = [...new Set(currencyIds)];
  if (ids.length === 0) {
    return [];
  }
  const records = await transaction.select().from(currencies).where(inArray(currencies.id, ids));
  const result: Currency[] = [];
  for (const currency of records) {
    result.push(await currencyDto(transaction, currency));
  }
  return result;
}
async function journalInitiator(
  transaction: Transaction,
  record: typeof ledgerTransactions.$inferSelect,
): Promise<string> {
  if (record.companyDecisionId !== null) {
    const [decision] = await transaction
      .select({ createdBy: companyDecisions.createdBy })
      .from(companyDecisions)
      .where(eq(companyDecisions.id, record.companyDecisionId));
    if (!decision) {
      throw new Error('Missing corporate journal source');
    }
    return decision.createdBy;
  }
  if (record.directiveId !== null) {
    const [directive] = await transaction
      .select({ createdBy: monetaryDirectives.createdBy })
      .from(monetaryDirectives)
      .where(eq(monetaryDirectives.id, record.directiveId));
    if (!directive) {
      throw new Error('Missing state journal source');
    }
    return directive.createdBy;
  }
  const [operation] = await transaction
    .select({ initiatorId: economicOperations.initiatorId })
    .from(economicJournals)
    .innerJoin(economicOperations, eq(economicOperations.id, economicJournals.operationId))
    .where(eq(economicJournals.journalId, record.id));
  return operation?.initiatorId ?? record.actorId;
}
async function journalDto(
  transaction: Transaction,
  record: typeof ledgerTransactions.$inferSelect,
): Promise<LedgerTransaction> {
  const postings = await transaction
    .select({ account: financialAccounts, deltaMinor: ledgerPostings.deltaMinor })
    .from(ledgerPostings)
    .innerJoin(financialAccounts, eq(financialAccounts.id, ledgerPostings.accountId))
    .where(eq(ledgerPostings.transactionId, record.id));
  const [link] = await transaction
    .select()
    .from(economicJournals)
    .where(eq(economicJournals.journalId, record.id));
  return {
    id: record.id,
    economicOperationId: link?.operationId ?? null,
    currencyId: record.currencyId,
    kind: record.kind,
    amountMinor: record.amountMinor,
    purpose: record.purpose,
    actorId: record.actorId,
    initiatorId: await journalInitiator(transaction, record),
    directiveId: record.directiveId,
    companyDecisionId: record.companyDecisionId,
    policyRevisionId: record.policyRevisionId,
    createdAt: record.createdAt.toISOString(),
    postings: postings.map((posting) => ({
      account: {
        id: posting.account.id,
        currencyId: posting.account.currencyId,
        kind: posting.account.kind,
        ownerId: posting.account.ownerId,
      },
      deltaMinor: posting.deltaMinor,
    })),
  };
}
async function accountHistory(
  transaction: Transaction,
  accounts: readonly Account[],
  page = 1,
): Promise<LedgerTransaction[]> {
  if (accounts.length === 0) {
    return [];
  }
  const rows = await transaction
    .selectDistinct({ journal: ledgerTransactions })
    .from(ledgerTransactions)
    .innerJoin(ledgerPostings, eq(ledgerPostings.transactionId, ledgerTransactions.id))
    .where(
      inArray(
        ledgerPostings.accountId,
        accounts.map((item) => item.id),
      ),
    )
    .orderBy(desc(ledgerTransactions.createdAt), desc(ledgerTransactions.id))
    .limit(HISTORY_LIMIT + 1)
    .offset((page - 1) * HISTORY_LIMIT);
  const result: LedgerTransaction[] = [];
  for (const row of rows) {
    result.push(await journalDto(transaction, row.journal));
  }
  return result;
}
async function stateAccounts(
  transaction: Transaction,
  stateId: string,
  bankId: string | null,
): Promise<Account[]> {
  const records = await transaction
    .select()
    .from(financialAccounts)
    .where(
      or(
        and(eq(financialAccounts.kind, 'TREASURY'), eq(financialAccounts.ownerId, stateId)),
        bankId === null
          ? undefined
          : and(eq(financialAccounts.kind, 'CENTRAL_BANK'), eq(financialAccounts.ownerId, bankId)),
      ),
    );
  const result: Account[] = [];
  for (const record of records) {
    const reserved =
      record.kind === 'CENTRAL_BANK' && record.balanceMinor !== '0'
        ? await bankReservedMinor(transaction, record.ownerId, record.currencyId)
        : '0';
    result.push({
      ...accountDto(record),
      reservedMinor: reserved,
      availableMinor: (BigInt(record.balanceMinor) - BigInt(reserved)).toString(),
    });
  }
  return result;
}
async function stateDirectiveIds(
  transaction: Transaction,
  stateId: string,
  page = 1,
): Promise<string[]> {
  const records = await transaction
    .select({ id: monetaryDirectives.id })
    .from(monetaryDirectives)
    .where(eq(monetaryDirectives.stateId, stateId))
    .orderBy(desc(monetaryDirectives.createdAt), desc(monetaryDirectives.id))
    .limit(HISTORY_LIMIT + 1)
    .offset((page - 1) * HISTORY_LIMIT);
  return records.map((record) => record.id);
}
export {
  HISTORY_LIMIT,
  accountDto,
  bankDto,
  currencyDto,
  heldCurrencyDtos,
  journalDto,
  accountHistory,
  stateAccounts,
  stateDirectiveIds,
};
