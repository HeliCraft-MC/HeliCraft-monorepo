import { eq } from 'drizzle-orm';
import { transferQuotes } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { TaxCalculation } from '../taxation/contracts';
import type { CompanyDecisionPayload } from './decision-contracts';

async function decisionFinancialEvidence(
  transaction: Transaction,
  payload: CompanyDecisionPayload,
): Promise<TaxCalculation | undefined> {
  if (payload.kind !== 'TRANSFER_FUNDS' || payload.quoteId === undefined) {
    return undefined;
  }
  const [quote] = await transaction
    .select({ calculation: transferQuotes.calculation })
    .from(transferQuotes)
    .where(eq(transferQuotes.id, payload.quoteId));
  return quote?.calculation;
}
export { decisionFinancialEvidence };
