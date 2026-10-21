import { eq, sql } from 'drizzle-orm';
import { centralBanks } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryError } from '../monetary/domain';

async function bankReservedMinor(
  transaction: Transaction,
  bankId: string,
  currencyId: string,
): Promise<string> {
  const [row] = await transaction
    .select({
      reserved: sql<string>`bank_reserved_minor(${bankId}::uuid,${currencyId}::uuid)::text`,
    })
    .from(centralBanks)
    .where(eq(centralBanks.id, bankId));
  return row?.reserved ?? '0';
}
async function assertAvailableBankFunds(
  transaction: Transaction,
  input: Readonly<{
    bankId: string;
    currencyId: string;
    balanceMinor: string;
    amountMinor: string;
  }>,
): Promise<void> {
  const reserved = await bankReservedMinor(transaction, input.bankId, input.currencyId);
  if (BigInt(input.balanceMinor) - BigInt(reserved) < BigInt(input.amountMinor)) {
    monetaryError(
      'INSUFFICIENT_AVAILABLE_FUNDS',
      'Недостаточно свободных средств с учётом обеспеченных валютных предложений',
    );
  }
}
export { bankReservedMinor, assertAvailableBankFunds };
