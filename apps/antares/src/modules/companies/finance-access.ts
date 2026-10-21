import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import type { CompanyActor } from './decision-contracts';
import { companyRecord } from './store';
import { readCompanyRevision } from './revisions';
import { companyHolders } from './decision-authority';
import { mayReadCompanyFinances } from './finance-role';
import { currentShareholderParticipant } from './shareholder-access';

async function assertCompanyFinanceReader(
  transaction: Transaction,
  companyId: string,
  actor: CompanyActor,
): Promise<void> {
  const company = await companyRecord(transaction, companyId);
  if (company.currentRevisionId === null || company.foundedAt === null) {
    throw new DomainError(
      HTTP.notFound,
      'COMPANY_FINANCES_NOT_FOUND',
      'Финансы компании не найдены',
    );
  }
  if (actor.admin) {
    return;
  }
  const { content } = await readCompanyRevision(transaction, company.currentRevisionId);
  const roles = {
    actorId: actor.id,
    holders: await companyHolders(transaction, companyId),
    shareholder: await currentShareholderParticipant(transaction, companyId, actor.id),
  };
  if (!mayReadCompanyFinances(content.charter, roles)) {
    throw new DomainError(
      HTTP.notFound,
      'COMPANY_FINANCES_NOT_FOUND',
      'Финансы компании не найдены',
    );
  }
}
export { assertCompanyFinanceReader };
