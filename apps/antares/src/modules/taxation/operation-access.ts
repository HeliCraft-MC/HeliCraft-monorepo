import type { economicOperations } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assertCompanyFinanceReader } from '../companies/finance-access';

async function companyFinancialParticipant(
  transaction: Transaction,
  companyId: string,
  actor: { id: string; admin: boolean },
): Promise<boolean> {
  try {
    await assertCompanyFinanceReader(transaction, companyId, actor);
    return true;
  } catch (error) {
    if (error instanceof DomainError && error.code === 'COMPANY_FINANCES_NOT_FOUND') {
      return false;
    }
    throw error;
  }
}
async function assertOperationReader(
  transaction: Transaction,
  operation: typeof economicOperations.$inferSelect,
  actor: { id: string; admin: boolean },
): Promise<void> {
  if (operation.senderKind === 'PLAYER' && operation.senderId === actor.id) {
    return;
  }
  if (
    operation.recipientKind === 'PLAYER' &&
    operation.recipientId === actor.id &&
    operation.calculation.charges.some((charge) => charge.taxpayer === 'RECIPIENT')
  ) {
    return;
  }
  if (
    operation.senderKind === 'COMPANY' &&
    (await companyFinancialParticipant(transaction, operation.senderId, actor))
  ) {
    return;
  }
  if (
    operation.recipientKind === 'COMPANY' &&
    (await companyFinancialParticipant(transaction, operation.recipientId, actor))
  ) {
    return;
  }
  throw new DomainError(HTTP.notFound, 'OPERATION_NOT_FOUND', 'Операция не найдена');
}
export { assertOperationReader };
