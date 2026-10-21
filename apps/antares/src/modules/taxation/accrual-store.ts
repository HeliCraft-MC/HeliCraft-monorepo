import { and, eq, inArray } from 'drizzle-orm';
import { taxFractionalBalances, taxFractionalMovements } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { TaxCalculation, TaxCharge } from './contracts';
import { accrueTaxes } from './accrual';

async function accruedCalculation(
  transaction: Transaction,
  calculation: TaxCalculation,
): Promise<TaxCalculation> {
  const rows = await transaction
    .select()
    .from(taxFractionalBalances)
    .where(
      and(
        eq(taxFractionalBalances.currencyId, calculation.currencyId),
        inArray(taxFractionalBalances.taxpayerId, [calculation.senderId, calculation.recipientId]),
      ),
    )
    .for('update');
  return accrueTaxes(calculation, new Map(rows.map((row) => [row.key, row.remainder])));
}
async function recordAccruals(
  transaction: Transaction,
  assessmentId: string,
  charge: TaxCharge,
): Promise<void> {
  const movements = charge.allocations.map((allocation) => {
    const { accrual } = allocation;
    if (!accrual) {
      throw new Error('Exact tax accrual evidence required');
    }
    return {
      assessmentId,
      balanceKey: accrual.key,
      exactNumerator: accrual.exactNumerator,
      remainderBefore: accrual.remainderBefore,
      remainderAfter: accrual.remainderAfter,
      collectedMinor: allocation.amountMinor,
    };
  });
  // The database derives and locks the obligation identity, then advances the balance from immutable evidence.
  await transaction.insert(taxFractionalMovements).values(movements);
}
export { accruedCalculation, recordAccruals };
