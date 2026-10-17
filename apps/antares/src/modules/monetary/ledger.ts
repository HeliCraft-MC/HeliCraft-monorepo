import { and, eq, sql } from 'drizzle-orm';
import {
  financialAccounts,
  ledgerTransactions,
  ledgerPostings,
  currencies,
  users,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { Account, DirectivePayload } from './contracts';
import { assertIssuance, monetaryError, monetaryHash } from './domain';
import { grossIssuance30d } from './statistics';
import { currentPolicy, monetaryAudit } from './store';
import type { CurrencyRecord, DirectiveRecord } from './store';

type AccountRecord = typeof financialAccounts.$inferSelect;
async function account(
  transaction: Transaction,
  identity: Readonly<{ currencyId: string; kind: Account['kind']; ownerId: string }>,
): Promise<AccountRecord> {
  const { currencyId, kind, ownerId } = identity;
  await transaction
    .insert(financialAccounts)
    .values({ currencyId, kind, ownerId })
    .onConflictDoNothing();
  const [record] = await transaction
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.currencyId, currencyId),
        eq(financialAccounts.kind, kind),
        eq(financialAccounts.ownerId, ownerId),
      ),
    )
    .for('update');
  if (!record) {
    throw new Error('Missing financial account');
  }
  return record;
}
async function playerAccount(
  transaction: Transaction,
  currencyId: string,
  userId: string,
): Promise<AccountRecord> {
  const [user] = await transaction
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, userId));
  if (user?.status !== 'ACTIVE') {
    monetaryError('RECIPIENT_UNAVAILABLE', 'Получатель не найден или его аккаунт недоступен');
  }
  return await account(transaction, { currencyId, kind: 'PLAYER', ownerId: userId });
}
interface PostingCommand {
  readonly actorId: string;
  readonly key: string;
  readonly hash: string;
  readonly currency: CurrencyRecord;
  readonly kind: 'ISSUE' | 'BURN' | 'TRANSFER';
  readonly amountMinor: string;
  readonly purpose: string;
  readonly source: AccountRecord;
  readonly target: AccountRecord;
  readonly directiveId: string | null;
  readonly policyRevisionId: string | null;
}
// oxlint-disable-next-line max-lines-per-function -- Journal, balancing postings, supply and audit form one atomic commit.
async function post(transaction: Transaction, command: PostingCommand): Promise<string> {
  if (command.source.id === command.target.id) {
    monetaryError('SAME_ACCOUNT', 'Выберите другой счёт получателя');
  }
  if (
    command.source.kind !== 'ISSUANCE' &&
    BigInt(command.source.balanceMinor) < BigInt(command.amountMinor)
  ) {
    monetaryError('INSUFFICIENT_FUNDS', 'Недостаточно средств на счёте');
  }
  const id = crypto.randomUUID();
  await transaction.insert(ledgerTransactions).values({
    id,
    actorId: command.actorId,
    idempotencyKey: command.key,
    payloadHash: command.hash,
    currencyId: command.currency.id,
    kind: command.kind,
    amountMinor: command.amountMinor,
    purpose: command.purpose,
    directiveId: command.directiveId,
    policyRevisionId: command.policyRevisionId,
    createdAt: sql`clock_timestamp()`,
  });
  // PostgreSQL posting triggers update balances; deferred constraints verify the complete balanced journal at commit.
  await transaction.insert(ledgerPostings).values([
    {
      transactionId: id,
      currencyId: command.currency.id,
      accountId: command.source.id,
      deltaMinor: `-${command.amountMinor}`,
    },
    {
      transactionId: id,
      currencyId: command.currency.id,
      accountId: command.target.id,
      deltaMinor: command.amountMinor,
    },
  ]);
  const deltas = {
    ISSUE: BigInt(command.amountMinor),
    BURN: -BigInt(command.amountMinor),
    TRANSFER: 0n,
  };
  const delta = deltas[command.kind];
  if (delta !== 0n) {
    await transaction
      .update(currencies)
      .set({ supplyMinor: (BigInt(command.currency.supplyMinor) + delta).toString() })
      .where(eq(currencies.id, command.currency.id));
  }
  await monetaryAudit(transaction, {
    actorId: command.actorId,
    id,
    action: `money.${command.kind.toLowerCase()}`,
  });
  return id;
}
async function previousTransaction(
  transaction: Transaction,
  request: Readonly<{ actorId: string; key: string; hash: string }>,
): Promise<string | null> {
  const { actorId, key, hash } = request;
  const [previous] = await transaction
    .select()
    .from(ledgerTransactions)
    .where(
      and(eq(ledgerTransactions.actorId, actorId), eq(ledgerTransactions.idempotencyKey, key)),
    );
  if (previous && previous.payloadHash !== hash) {
    monetaryError('IDEMPOTENCY_CONFLICT', 'Этот ключ уже использован для другого содержимого');
  }
  return previous?.id ?? null;
}
async function issuancePolicy(
  transaction: Transaction,
  currency: CurrencyRecord,
  amountMinor: string,
): Promise<string> {
  const policy = await currentPolicy(transaction, currency.id);
  const gross = await grossIssuance30d(transaction, currency.id);
  assertIssuance(policy?.limits ?? null, {
    amount: BigInt(amountMinor),
    supply: BigInt(currency.supplyMinor),
    gross,
  });
  if (!policy) {
    throw new Error('Validated policy missing');
  }
  return policy.id;
}
async function recipientAccount(
  transaction: Transaction,
  currency: CurrencyRecord,
  recipient: Extract<DirectivePayload, { kind: 'BANK_TRANSFER' }>['recipient'],
): Promise<AccountRecord> {
  if (recipient.type === 'PLAYER') {
    return await playerAccount(transaction, currency.id, recipient.userId);
  }
  return await account(transaction, {
    currencyId: currency.id,
    kind: recipient.type,
    ownerId: recipient.type === 'TREASURY' ? currency.stateId : currency.bankId,
  });
}
// oxlint-disable-next-line max-lines-per-function -- Approved commands choose fixed account types and post one atomic journal.
async function executeFinancial(
  transaction: Transaction,
  input: Readonly<{
    record: DirectiveRecord;
    payload: Extract<DirectivePayload, { amountMinor: string }>;
    currency: CurrencyRecord;
    actorId: string;
  }>,
): Promise<string> {
  const { record, payload, currency, actorId } = input;
  const hash = monetaryHash({ directiveId: record.id });
  const bank = await account(transaction, {
    currencyId: currency.id,
    kind: 'CENTRAL_BANK',
    ownerId: currency.bankId,
  });
  const issuance = await account(transaction, {
    currencyId: currency.id,
    kind: 'ISSUANCE',
    ownerId: currency.id,
  });
  let source = bank;
  if (payload.kind === 'ISSUE') {
    source = issuance;
  }
  if (payload.kind === 'TREASURY_TRANSFER') {
    source = await account(transaction, {
      currencyId: currency.id,
      kind: 'TREASURY',
      ownerId: currency.stateId,
    });
  }
  let target = bank;
  if (payload.kind === 'BURN') {
    target = issuance;
  }
  if ('recipient' in payload) {
    target = await recipientAccount(transaction, currency, payload.recipient);
  }
  const policy = await currentPolicy(transaction, currency.id);
  const policyRevisionId =
    payload.kind === 'ISSUE'
      ? await issuancePolicy(transaction, currency, payload.amountMinor)
      : (policy?.id ?? null);
  return await post(transaction, {
    actorId,
    key: record.id,
    hash,
    currency,
    kind: payload.kind === 'ISSUE' || payload.kind === 'BURN' ? payload.kind : 'TRANSFER',
    amountMinor: payload.amountMinor,
    purpose: payload.purpose,
    source,
    target,
    directiveId: record.id,
    policyRevisionId,
  });
}
export { account, playerAccount, post, previousTransaction, executeFinancial };
