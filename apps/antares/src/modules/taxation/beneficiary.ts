import { eq } from 'drizzle-orm';
import { centralBanks } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryError } from '../monetary/domain';
import type { TaxRule, TaxClaim } from './contracts';

async function taxBeneficiary(
  transaction: Transaction,
  stateId: string,
  rule: Pick<TaxRule, 'recipient'>,
): Promise<NonNullable<TaxClaim['beneficiary']>> {
  if (rule.recipient === 'STATE_TREASURY') {
    return { kind: 'TREASURY', ownerId: stateId };
  }
  const [bank] = await transaction
    .select({ id: centralBanks.id, status: centralBanks.status })
    .from(centralBanks)
    .where(eq(centralBanks.stateId, stateId));
  if (bank?.status !== 'ACTIVE') {
    monetaryError(
      'TAX_BENEFICIARY_UNAVAILABLE',
      'Утверждённый получатель налога недоступен. Требуется действующий Центральный банк',
    );
  }
  return { kind: 'CENTRAL_BANK', ownerId: bank.id };
}
export { taxBeneficiary };
