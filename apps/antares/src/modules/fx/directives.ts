import type { Transaction } from '../permissions/transaction';
import type { DirectiveRecord } from '../monetary/store';
import type { FxDirective } from './contracts';
import {
  assertOfferPublication,
  assertOfferCancellation,
  publishOffer,
  closeOffer,
} from './offers';
import { assertInterbankApproval, approveInterbank } from './interbank';

async function assertFxDirective(
  transaction: Transaction,
  stateId: string,
  payload: FxDirective,
): Promise<void> {
  if (payload.kind === 'PUBLISH_FX_OFFER') {
    await assertOfferPublication(transaction, stateId, payload);
  } else if (payload.kind === 'CANCEL_FX_OFFER') {
    await assertOfferCancellation(transaction, stateId, payload);
  } else {
    await assertInterbankApproval(transaction, stateId, payload);
  }
}
async function executeFxDirective(
  transaction: Transaction,
  input: Readonly<{ record: DirectiveRecord; actorId: string }>,
  payload: FxDirective,
): Promise<void> {
  const { record, actorId } = input;
  await assertFxDirective(transaction, record.stateId, payload);
  if (payload.kind === 'PUBLISH_FX_OFFER') {
    await publishOffer(transaction, input, payload);
  } else if (payload.kind === 'CANCEL_FX_OFFER') {
    await closeOffer(transaction, {
      offerId: payload.offerId,
      kind: 'CANCEL',
      directiveId: record.id,
      actorId,
    });
  } else {
    await approveInterbank(transaction, input, payload);
  }
}
export { assertFxDirective, executeFxDirective };
