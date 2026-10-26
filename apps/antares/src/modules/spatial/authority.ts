import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assignmentState } from '../states/office-assignment-context';
import { policyActor } from '../monetary/evidence';
import { monetaryActor } from '../monetary/store';
import type { MonetaryActor } from '../monetary/contracts';

async function editorState(
  transaction: Transaction,
  stateId: string,
  actor: MonetaryActor,
): Promise<void> {
  await monetaryActor(transaction, actor);
  const state = await assignmentState(transaction, stateId, actor);
  const policy = state.configuration.governance.policies.find(
    (item) => item.action === 'CHANGE_TERRITORY',
  );
  if (state.status !== 'ACTIVE' || !policy || !policyActor(state, policy, actor.id)) {
    throw new DomainError(
      HTTP.forbidden,
      'TERRITORY_AUTHORITY_REQUIRED',
      'An active CHANGE_TERRITORY procedure and current state authority are required',
    );
  }
}
export { editorState };
export type { MonetaryActor } from '../monetary/contracts';
