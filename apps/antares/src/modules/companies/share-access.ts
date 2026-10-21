// oxlint-disable import/max-dependencies -- Share proposal/read roles derive from the actual player owner, corporate policies or state Governance; this never executes an owner decision.
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assignmentState } from '../states/office-assignment-context';
import { policyActor } from '../monetary/evidence';
import { decisionPolicy } from '../monetary/domain';
import type { CompanyAction, LegalOwner } from './contracts';
import { companyRecord } from './store';
import { readCompanyRevision } from './revisions';
import { companyProcedure } from './domain';
import { companyHolders, procedureActor } from './decision-authority';
import { currentShareholderParticipant } from './shareholder-access';
import { assertCompanyReader } from './company-read-access';

type ShareIntent = 'ISSUE' | 'TRANSFER' | 'ACQUIRE';
const SHARE_ACTIONS: Record<ShareIntent, CompanyAction> = {
  ISSUE: 'ISSUE_SHARES',
  TRANSFER: 'TRANSFER_OWNED_SHARES',
  ACQUIRE: 'ACCEPT_SHARE_ACQUISITION',
};
async function mayProposeShares(
  transaction: Transaction,
  input: Readonly<{ owner: LegalOwner; actorId: string; intent: ShareIntent }>,
): Promise<boolean> {
  const { owner, actorId, intent } = input;
  if (owner.type === 'PLAYER') {
    return owner.id === actorId && intent !== 'ISSUE';
  }
  if (owner.type === 'STATE') {
    const state = await assignmentState(transaction, owner.id, { id: actorId, admin: false });
    const kind = intent === 'TRANSFER' ? 'TRANSFER_COMPANY_SHARES' : 'ACCEPT_SHARE_ACQUISITION';
    const policy = decisionPolicy(state.configuration.governance.policies, kind);
    return (
      intent !== 'ISSUE' &&
      state.status === 'ACTIVE' &&
      policy !== undefined &&
      policyActor(state, policy, actorId)
    );
  }
  const company = await companyRecord(transaction, owner.id);
  if (company.status !== 'ACTIVE' || company.currentRevisionId === null) {
    return false;
  }
  const { content } = await readCompanyRevision(transaction, company.currentRevisionId);
  const procedure = companyProcedure(content.charter, SHARE_ACTIONS[intent]);
  return procedureActor(procedure, {
    actorId,
    holders: await companyHolders(transaction, company.id),
    shareholder: await currentShareholderParticipant(transaction, company.id, actorId),
  });
}
async function canReadShareOwner(
  transaction: Transaction,
  owner: LegalOwner,
  actorId: string,
): Promise<boolean> {
  if (owner.type === 'PLAYER') {
    return owner.id === actorId;
  }
  try {
    await (owner.type === 'STATE'
      ? assignmentState(transaction, owner.id, { id: actorId, admin: false })
      : assertCompanyReader(transaction, owner.id, { id: actorId, admin: false }));
    return true;
  } catch (error) {
    if (
      error instanceof DomainError &&
      (error.status === HTTP.notFound || error.code === 'CITIZEN_REQUIRED')
    ) {
      return false;
    }
    throw error;
  }
}
export { mayProposeShares, canReadShareOwner };
