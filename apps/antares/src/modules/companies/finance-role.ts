import type { CompanyCharter } from './contracts';
import { procedureActor } from './decision-authority';
import type { CurrentCompanyHolder } from './decision-authority';

interface CompanyFinancialRoles {
  readonly actorId: string;
  readonly shareholder: boolean;
  readonly holders: readonly CurrentCompanyHolder[];
}
function mayReadCompanyFinances(charter: CompanyCharter, roles: CompanyFinancialRoles): boolean {
  const policy = charter.policies.find((candidate) => candidate.action === 'TRANSFER_FUNDS');
  if (policy === undefined) {
    return false;
  }
  return [policy.procedure, ...policy.financialBands.map((band) => band.procedure)].some(
    (procedure) => procedureActor(procedure, roles),
  );
}
export { mayReadCompanyFinances };
