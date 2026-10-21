import type { Transaction } from '../permissions/transaction';
import { draftParticipant } from './draft-participant';
import type { DraftRecord } from './drafts';
import { canReadShareOwner } from './share-access';

async function canReadFormation(
  transaction: Transaction,
  draft: DraftRecord,
  actorId: string,
): Promise<boolean> {
  if (draftParticipant(draft, actorId)) {
    return true;
  }
  for (const allocation of draft.configuration.allocations) {
    if (
      allocation.owner.type !== 'PLAYER' &&
      // oxlint-disable-next-line no-await-in-loop -- Entity founder read roles are checked serially on one transaction connection and never grant consent.
      (await canReadShareOwner(transaction, allocation.owner, actorId))
    ) {
      return true;
    }
  }
  return false;
}
export { canReadFormation };
