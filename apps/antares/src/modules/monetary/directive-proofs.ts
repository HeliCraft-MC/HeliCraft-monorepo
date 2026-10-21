// oxlint-disable import/max-dependencies -- Shared immutable state-decision evidence composes revisions, current office terms and generic voting without execution dispatch.
import { and, eq, isNull, lte, sql } from 'drizzle-orm';
import { monetaryDirectives, users, stateOfficeHolders } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { assignmentState } from '../states/office-assignment-context';
import { policyRequirements } from '../states/office-assignment-domain';
import type { StateDetail, Policy } from '../states/contracts';
import { readRevision } from '../states/revisions';
import { DomainError, HTTP } from '../errors';
import { directiveRecord, hydratePayload, currentPolicy } from './store';
import type { DirectiveRecord } from './store';
import type { DirectivePayload, MonetaryActor } from './contracts';
import { directiveVotes } from './votes';
import { decisionPolicy, monetaryHash, monetaryError } from './domain';
import { policyActor, directiveApprovals, proofsMet } from './evidence';

async function directiveIsStale(
  transaction: Transaction,
  context: Readonly<{
    record: DirectiveRecord;
    state: StateDetail;
    policy: Policy;
    payload: DirectivePayload;
  }>,
): Promise<boolean> {
  const { record, state, policy, payload } = context;
  const [creator] = await transaction
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, record.createdBy));
  const holderTerms = await transaction
    .select({ officeId: stateOfficeHolders.officeId })
    .from(stateOfficeHolders)
    .where(
      and(
        eq(stateOfficeHolders.userId, record.createdBy),
        isNull(stateOfficeHolders.until),
        lte(
          stateOfficeHolders.since,
          sql`(select ${monetaryDirectives.createdAt} from ${monetaryDirectives} where ${monetaryDirectives.id} = ${record.id})`,
        ),
      ),
    );
  const uninterrupted =
    ['CITIZEN_VOTE', 'MANUAL'].includes(policy.mechanism) ||
    holderTerms.some((holder) => policy.officeIds.includes(holder.officeId));
  const current =
    'currencyId' in payload ? await currentPolicy(transaction, payload.currencyId) : null;
  return (
    state.status !== 'ACTIVE' ||
    state.governanceRevisionId !== record.governanceRevisionId ||
    creator?.status !== 'ACTIVE' ||
    !policyActor(state, policy, record.createdBy) ||
    !uninterrupted ||
    ('amountMinor' in payload && (current?.id ?? null) !== record.policyRevisionId)
  );
}
async function directiveProofs(
  transaction: Transaction,
  id: string,
  actor: MonetaryActor,
): Promise<{
  record: DirectiveRecord;
  state: StateDetail;
  payload: DirectivePayload;
  policy: Policy;
  stale: boolean;
  ready: boolean;
  requirements: ReturnType<typeof policyRequirements>;
  approvals: Awaited<ReturnType<typeof directiveApprovals>>;
  votes: Awaited<ReturnType<typeof directiveVotes>>;
}> {
  const initial = await directiveRecord(transaction, id);
  const state = await assignmentState(transaction, initial.stateId, actor);
  const record = await directiveRecord(transaction, id);
  const payload = await hydratePayload(transaction, record);
  if (monetaryHash(payload) !== record.payloadHash) {
    monetaryError('DIRECTIVE_INTEGRITY', 'Содержимое распоряжения не совпадает с утверждённым');
  }
  const revision =
    state.governanceRevisionId === record.governanceRevisionId
      ? null
      : await readRevision(transaction, record.governanceRevisionId);
  const pinned = revision?.configuration ?? state.configuration;
  const policy = decisionPolicy(pinned.governance.policies, payload.kind);
  if (!policy) {
    throw new DomainError(
      HTTP.forbidden,
      'MONETARY_POLICY_MISSING',
      'Полномочие не настроено в Governance',
    );
  }
  const stale = await directiveIsStale(transaction, { record, state, policy, payload });
  const approvals = await directiveApprovals(transaction, state, id);
  const votes = await directiveVotes(transaction, record);
  const requirements = policyRequirements(policy, state.id, pinned.governance.votingDefaults);
  const ready = !stale && proofsMet(policy, state, { approvals, votes });
  return { record, state, payload, policy, stale, approvals, votes, requirements, ready };
}
export { directiveProofs };
