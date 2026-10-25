// oxlint-disable import/max-dependencies -- Inbox authority delegates to the existing state policies and corporate charter proof readers.
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assignmentState } from '../states/office-assignment-context';
import { decisionPolicy } from '../monetary/domain';
import { policyActor } from '../monetary/evidence';
import { companyProcedure } from './domain';
import { companyHolders, procedureActor } from './decision-authority';
import { currentShareholderParticipant } from './shareholder-access';
import { companyRecord } from './store';
import { readCompanyRevision } from './revisions';
import type { CompanyAction, LegalOwner } from './contracts';

function inaccessible(error: unknown): boolean {
  return (
    error instanceof DomainError &&
    [HTTP.forbidden, HTTP.notFound].some((status) => status === error.status)
  );
}
async function mayActForEntity(
  transaction: Transaction,
  input: Readonly<{ owner: LegalOwner; actorId: string; action: CompanyAction }>,
): Promise<boolean> {
  const { owner, actorId, action } = input;
  if (owner.type === 'PLAYER') {
    return owner.id === actorId;
  }
  try {
    if (owner.type === 'STATE') {
      const state = await assignmentState(transaction, owner.id, { id: actorId, admin: false });
      const kind =
        action === 'FOUND_COMPANY' ? 'CONSENT_COMPANY_FORMATION' : 'ACCEPT_SHARE_ACQUISITION';
      const policy = decisionPolicy(state.configuration.governance.policies, kind);
      return (
        state.status === 'ACTIVE' && policy !== undefined && policyActor(state, policy, actorId)
      );
    }
    const company = await companyRecord(transaction, owner.id);
    if (company.status !== 'ACTIVE' || company.currentRevisionId === null) {
      return false;
    }
    const { content } = await readCompanyRevision(transaction, company.currentRevisionId);
    return procedureActor(companyProcedure(content.charter, action), {
      actorId,
      holders: await companyHolders(transaction, company.id),
      shareholder: await currentShareholderParticipant(transaction, company.id, actorId),
    });
  } catch (error) {
    if (inaccessible(error)) {
      return false;
    }
    throw error;
  }
}
export { mayActForEntity, inaccessible };
