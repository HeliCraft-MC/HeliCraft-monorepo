// oxlint-disable no-use-before-define -- Cached corporate and shareholder adapters are mutually recursive over the acyclic ownership graph.
// oxlint-disable no-await-in-loop -- Governance participation is checked sequentially for real legal owners on the graph-locked transaction connection.
import { and, eq, gt } from 'drizzle-orm';
import { companyShareBalances, legalSubjects } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assignmentState } from '../states/office-assignment-context';
import { policyActor } from '../monetary/evidence';
import { companyRecord } from './store';
import { readCompanyRevision } from './revisions';
import { companyHolders, procedureActor } from './decision-authority';
import type { LegalOwner } from './contracts';

interface ParticipationContext {
  readonly actorId: string;
  readonly cache: Map<string, boolean>;
}
async function stateParticipant(
  transaction: Transaction,
  stateId: string,
  actorId: string,
): Promise<boolean> {
  try {
    const state = await assignmentState(transaction, stateId, { id: actorId, admin: false });
    const policy = state.configuration.governance.policies.find(
      (candidate) => candidate.action === 'PARTICIPATE_IN_COMPANY',
    );
    return state.status === 'ACTIVE' && policy !== undefined && policyActor(state, policy, actorId);
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
async function corporateParticipant(
  transaction: Transaction,
  companyId: string,
  context: ParticipationContext,
): Promise<boolean> {
  const cached = context.cache.get(companyId);
  if (cached !== undefined) {
    return cached;
  }
  context.cache.set(companyId, false);
  const company = await companyRecord(transaction, companyId);
  if (company.status !== 'ACTIVE' || company.currentRevisionId === null) {
    return false;
  }
  const { content } = await readCompanyRevision(transaction, company.currentRevisionId);
  const policy = content.charter.policies.find(
    (candidate) => candidate.action === 'VOTE_AS_SHAREHOLDER',
  );
  if (!policy) {
    return false;
  }
  const holders = await companyHolders(transaction, company.id);
  const needsOwners = ['SHAREHOLDER_VOTE', 'COMBINED', 'MANUAL'].includes(
    policy.procedure.mechanism,
  );
  const shareholder =
    needsOwners && (await shareholderParticipant(transaction, company.id, context));
  const allowed = procedureActor(policy.procedure, {
    actorId: context.actorId,
    shareholder,
    holders,
  });
  context.cache.set(companyId, allowed);
  return allowed;
}
async function shareholderParticipant(
  transaction: Transaction,
  companyId: string,
  context: ParticipationContext,
): Promise<boolean> {
  const owners = await transaction
    .select({ subject: legalSubjects })
    .from(companyShareBalances)
    .innerJoin(legalSubjects, eq(legalSubjects.id, companyShareBalances.subjectId))
    .where(
      and(eq(companyShareBalances.companyId, companyId), gt(companyShareBalances.shares, '0')),
    );
  for (const { subject } of owners) {
    if (subject.kind === 'PLAYER' && subject.playerId === context.actorId) {
      return true;
    }
    if (
      subject.kind === 'STATE' &&
      subject.stateId !== null &&
      (await stateParticipant(transaction, subject.stateId, context.actorId))
    ) {
      return true;
    }
    if (
      subject.kind === 'COMPANY' &&
      subject.companyId !== null &&
      (await corporateParticipant(transaction, subject.companyId, context))
    ) {
      return true;
    }
  }
  return false;
}
async function currentShareholderParticipant(
  transaction: Transaction,
  companyId: string,
  actorId: string,
): Promise<boolean> {
  return await shareholderParticipant(transaction, companyId, { actorId, cache: new Map() });
}
async function legalEntityVotingParticipant(
  transaction: Transaction,
  owner: LegalOwner,
  actorId: string,
): Promise<boolean> {
  if (owner.type === 'PLAYER') {
    return false;
  }
  return owner.type === 'STATE'
    ? await stateParticipant(transaction, owner.id, actorId)
    : await corporateParticipant(transaction, owner.id, { actorId, cache: new Map() });
}
export { currentShareholderParticipant, legalEntityVotingParticipant };
