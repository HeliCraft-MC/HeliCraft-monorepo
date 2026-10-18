import { institutionConfiguration } from './institution-policies';
// oxlint-disable import/max-dependencies -- Execution availability composes bank, taxation and treaty domain checks under the existing directive boundary.
import { TaxDirectiveSchema } from '../taxation/contracts';
import { TreatyDirectiveSchema } from '../diplomacy/contracts';
import { assertTaxDirective } from '../taxation/laws';
import { assertTreatyDirective } from '../diplomacy/availability';
import { and, eq } from 'drizzle-orm';
import { financialAccounts, users } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError } from '../errors';
import type { DirectivePayload } from './contracts';
import type { CurrencyRecord } from './store';
import { assertBankCurrency, currentPolicy } from './store';
import { assertIssuance, monetaryError } from './domain';
import { grossIssuance30d } from './statistics';

type FinancialPayload = Extract<DirectivePayload, { amountMinor: string }>;
async function assertRecipient(transaction: Transaction, payload: FinancialPayload): Promise<void> {
  if (!('recipient' in payload)) {
    return;
  }
  if (
    (payload.kind === 'BANK_TRANSFER' && payload.recipient.type === 'CENTRAL_BANK') ||
    (payload.kind === 'TREASURY_TRANSFER' && payload.recipient.type === 'TREASURY')
  ) {
    monetaryError('SAME_ACCOUNT', 'Выберите другой счёт получателя');
  }
  if (payload.recipient.type === 'PLAYER') {
    const [user] = await transaction
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, payload.recipient.userId));
    if (user?.status !== 'ACTIVE') {
      monetaryError('RECIPIENT_UNAVAILABLE', 'Получатель не найден или его аккаунт недоступен');
    }
  }
}
async function assertFunded(
  transaction: Transaction,
  currency: CurrencyRecord,
  payload: FinancialPayload,
): Promise<void> {
  const kind = payload.kind === 'TREASURY_TRANSFER' ? 'TREASURY' : 'CENTRAL_BANK';
  const ownerId = kind === 'TREASURY' ? currency.stateId : currency.bankId;
  const [source] = await transaction
    .select({ balance: financialAccounts.balanceMinor })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.currencyId, currency.id),
        eq(financialAccounts.kind, kind),
        eq(financialAccounts.ownerId, ownerId),
      ),
    );
  if (BigInt(source?.balance ?? '0') < BigInt(payload.amountMinor)) {
    monetaryError('INSUFFICIENT_FUNDS', 'Недостаточно средств на счёте');
  }
}
async function assertExecutable(
  transaction: Transaction,
  stateId: string,
  payload: DirectivePayload,
): Promise<void> {
  if (
    (payload.kind === 'ESTABLISH_BANK' || payload.kind === 'ESTABLISH_TAX_OFFICE') &&
    payload.initialPolicies !== undefined
  ) {
    await institutionConfiguration(transaction, stateId, payload);
  }
  const tax = TaxDirectiveSchema.safeParse(payload);
  if (tax.success) {
    await assertTaxDirective(transaction, stateId, tax.data);
    return;
  }
  const treaty = TreatyDirectiveSchema.safeParse(payload);
  if (treaty.success) {
    await assertTreatyDirective(transaction, stateId, treaty.data);
    return;
  }
  const { currency } = await assertBankCurrency(transaction, stateId, payload);
  if (currency === null || !('amountMinor' in payload)) {
    return;
  }
  if (payload.kind === 'ISSUE') {
    const policy = await currentPolicy(transaction, currency.id);
    assertIssuance(policy?.limits ?? null, {
      amount: BigInt(payload.amountMinor),
      supply: BigInt(currency.supplyMinor),
      gross: await grossIssuance30d(transaction, currency.id),
    });
  } else {
    await assertFunded(transaction, currency, payload);
  }
  await assertRecipient(transaction, payload);
}
async function executionProblem(
  transaction: Transaction,
  stateId: string,
  payload: DirectivePayload,
): Promise<string | null> {
  try {
    await assertExecutable(transaction, stateId, payload);
    return null;
  } catch (error) {
    if (error instanceof DomainError) {
      return error.message;
    }
    throw error;
  }
}
export { assertExecutable, executionProblem };
