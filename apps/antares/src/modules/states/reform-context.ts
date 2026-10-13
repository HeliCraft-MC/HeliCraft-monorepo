import { and, eq, isNull } from 'drizzle-orm';

import type { stateDrafts, states } from '../../db/schema';
import { stateMemberships } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';

import { DomainError, HTTP } from '../errors';

import { stateRecord } from './persistence';
import { readRevision } from './revisions';
import { lockedDraft, assertEditable } from './drafts';
import type { StateConfiguration, Policy } from './contracts';

async function requireCitizen(
  transaction: Transaction,
  stateId: string,
  actorId: string,
): Promise<void> {
  const [member] = await transaction
    .select()
    .from(stateMemberships)
    .where(
      and(
        eq(stateMemberships.stateId, stateId),
        eq(stateMemberships.userId, actorId),
        isNull(stateMemberships.endedAt),
      ),
    );
  if (!member) {
    throw new DomainError(HTTP.forbidden, 'CITIZEN_REQUIRED', 'Требуется гражданство государства');
  }
}
async function contextForDraft(
  transaction: Transaction,
  input: Readonly<{ draftId: string; ownerId: string; version: number }>,
): Promise<{
  draft: typeof stateDrafts.$inferSelect;
  state: typeof states.$inferSelect;
  policy: Policy;
  current: StateConfiguration;
}> {
  const draft = await lockedDraft(transaction, input.draftId, input.ownerId);
  assertEditable(draft, input.version);
  if (draft.stateId === null) {
    throw new DomainError(HTTP.badRequest, 'CREATION_DRAFT', 'Это черновик создания государства');
  }
  const state = await stateRecord(transaction, draft.stateId);
  if (state.status !== 'ACTIVE' || state.currentRevisionId === null) {
    throw new DomainError(HTTP.conflict, 'STATE_INACTIVE', 'Государство не активно');
  }
  if (draft.baseRevisionId !== state.currentRevisionId) {
    throw new DomainError(
      HTTP.conflict,
      'REFORM_CONFLICT',
      'После создания черновика опубликована новая редакция',
    );
  }
  const current = await readRevision(transaction, state.currentRevisionId);
  const policy = current.configuration.governance.policies.find(
    (candidate) => candidate.action === 'AMEND_GOVERNANCE',
  );
  if (!policy) {
    throw new DomainError(HTTP.forbidden, 'NO_AMENDMENT_POLICY', 'Процедура реформы отсутствует');
  }
  return { draft, state, policy, current: current.configuration };
}
export { requireCitizen, contextForDraft };
