import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { companyRecord } from './store';
import { companyHolders } from './decision-authority';
import { currentShareholderParticipant } from './shareholder-access';
import type { CompanyActor } from './decision-contracts';

async function assertCompanyReader(
  transaction: Transaction,
  companyId: string,
  actor: CompanyActor,
): Promise<Awaited<ReturnType<typeof companyRecord>>> {
  const company = await companyRecord(transaction, companyId);
  const holders = await companyHolders(transaction, company.id);
  if (
    company.currentRevisionId === null ||
    (!actor.admin &&
      !holders.some((holder) => holder.userId === actor.id) &&
      !(await currentShareholderParticipant(transaction, companyId, actor.id)))
  ) {
    throw new DomainError(HTTP.notFound, 'COMPANY_NOT_FOUND', 'Компания не найдена');
  }
  return company;
}
export { assertCompanyReader };
