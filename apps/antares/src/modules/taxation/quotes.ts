import { eq } from 'drizzle-orm';
import { transferQuotes } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { WalletTransfer } from '../monetary/contracts';
import { monetaryHash, monetaryError } from '../monetary/domain';
import { currencyRecord } from '../monetary/store';
import { transferCalculation } from './context';
import type { TaxCalculation } from './contracts';
import { assertFinancialParty } from './party-store';

const QUOTE_TTL_MS = 300_000;
function transferCommandHash(input: WalletTransfer): string {
  const { quoteId: unused, ...command } = input;
  void unused;
  return monetaryHash(command);
}
async function storeTransferQuote(
  transaction: Transaction,
  input: Readonly<{ actorId: string; commandHash: string; calculation: TaxCalculation }>,
): Promise<{ id: string; expiresAt: string; calculation: TaxCalculation }> {
  const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
  const id = crypto.randomUUID();
  await transaction.insert(transferQuotes).values({
    id,
    actorId: input.actorId,
    commandHash: input.commandHash,
    calculationHash: monetaryHash(input.calculation),
    calculation: input.calculation,
    expiresAt,
  });
  return { id, calculation: input.calculation, expiresAt: expiresAt.toISOString() };
}
async function createQuote(
  transaction: Transaction,
  actorId: string,
  input: WalletTransfer,
): Promise<{ id: string; expiresAt: string; calculation: TaxCalculation }> {
  const currency = await currencyRecord(transaction, input.currencyId);
  if (currency.status !== 'ACTIVE' || input.recipientId === actorId) {
    monetaryError('TRANSFER_UNAVAILABLE', 'Выберите другого получателя и действующую валюту');
  }
  await assertFinancialParty(transaction, { kind: 'PLAYER', id: actorId });
  await assertFinancialParty(transaction, {
    kind: input.recipientType ?? 'PLAYER',
    id: input.recipientId,
  });
  const calculation = await transferCalculation(transaction, actorId, input);
  return await storeTransferQuote(transaction, {
    actorId,
    commandHash: transferCommandHash(input),
    calculation,
  });
}
async function confirmQuote(
  transaction: Transaction,
  actorId: string,
  input: WalletTransfer,
): Promise<TaxCalculation> {
  const calculation = await transferCalculation(transaction, actorId, input);
  if (input.quoteId === undefined && calculation.charges.length === 0) {
    return calculation;
  }
  const [quote] =
    input.quoteId === undefined
      ? []
      : await transaction.select().from(transferQuotes).where(eq(transferQuotes.id, input.quoteId));
  if (
    !quote ||
    quote.actorId !== actorId ||
    quote.commandHash !== transferCommandHash(input) ||
    quote.expiresAt.getTime() <= Date.now() ||
    quote.calculationHash !== monetaryHash(calculation)
  ) {
    monetaryError(
      'TAX_QUOTE_STALE',
      'Расчёт истёк или условия изменились. Получите новый расчёт и подтвердите перевод',
    );
  }
  return calculation;
}
export { createQuote, confirmQuote, storeTransferQuote, transferCommandHash };
