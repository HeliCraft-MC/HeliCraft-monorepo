import type { Transaction } from '../permissions/transaction';
import type { CompanyCharter, CompanyAction, CompanyStatus } from './contracts';
import type { CompanyActor } from './decision-contracts';
import { companyHolders, procedureActor } from './decision-authority';
import { currentShareholderParticipant } from './shareholder-access';
import { mayReadCompanyFinances } from './finance-role';

async function workspaceCapabilities(
  transaction: Transaction,
  input: Readonly<{
    companyId: string;
    status: CompanyStatus;
    actor: CompanyActor;
    charter: CompanyCharter;
  }>,
): Promise<{ availableActions: CompanyAction[]; canReadFinance: boolean }> {
  const roles = {
    actorId: input.actor.id,
    holders: await companyHolders(transaction, input.companyId),
    shareholder: await currentShareholderParticipant(transaction, input.companyId, input.actor.id),
  };
  return {
    availableActions:
      input.status === 'ACTIVE'
        ? input.charter.policies
            .filter(
              (policy) =>
                policy.action !== 'CLOSE_COMPANY' &&
                [policy.procedure, ...policy.financialBands.map((band) => band.procedure)].some(
                  (procedure) => procedureActor(procedure, roles),
                ),
            )
            .map((policy) => policy.action)
        : [],
    canReadFinance: input.actor.admin || mayReadCompanyFinances(input.charter, roles),
  };
}
export { workspaceCapabilities };
