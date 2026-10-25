import { and, eq, isNull } from 'drizzle-orm';
import { companyDrafts } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { companyRecord } from './store';
import { assertCompanyReader } from './company-read-access';
import { canReadFormation } from './formation-access';

async function assertCompanyMediaReader(
  transaction: Transaction,
  companyId: string,
  actorId: string,
): Promise<void> {
  const company = await companyRecord(transaction, companyId);
  if (company.foundedAt !== null) {
    await assertCompanyReader(transaction, companyId, { id: actorId, admin: false });
    return;
  }
  const drafts = await transaction
    .select()
    .from(companyDrafts)
    .where(and(eq(companyDrafts.companyId, companyId), isNull(companyDrafts.deletedAt)));
  for (const draft of drafts) {
    // oxlint-disable-next-line no-await-in-loop -- Participant access is checked on the same protected transaction.
    if (await canReadFormation(transaction, draft, actorId)) {
      return;
    }
  }
  throw new DomainError(HTTP.notFound, 'COMPANY_NOT_FOUND', 'Компания не найдена');
}
export { assertCompanyMediaReader };
