import type { Transaction } from '../permissions/transaction';
import type { DirectiveRecord } from '../monetary/store';
import { DomainError, HTTP } from '../errors';
import type { CompanyStateDirective } from './registration-contracts';
import {
  assertAcquisitionRecipient,
  recordShareConsent,
  assertShareConsentRevocable,
  revokeShareConsent,
} from './share-consents';
import { assertShareSettlement, settleShareTransfer } from './share-settlement';

type StateShareAction = Extract<
  CompanyStateDirective,
  { kind: 'ACCEPT_SHARE_ACQUISITION' | 'REVOKE_SHARE_ACQUISITION' | 'TRANSFER_COMPANY_SHARES' }
>;
function isStateShareAction(payload: CompanyStateDirective): payload is StateShareAction {
  return (
    payload.kind === 'ACCEPT_SHARE_ACQUISITION' ||
    payload.kind === 'REVOKE_SHARE_ACQUISITION' ||
    payload.kind === 'TRANSFER_COMPANY_SHARES'
  );
}
async function assertStateShareAction(
  transaction: Transaction,
  stateId: string,
  payload: StateShareAction,
): Promise<void> {
  if (payload.kind === 'ACCEPT_SHARE_ACQUISITION') {
    await assertAcquisitionRecipient(transaction, {
      operation: payload.operation,
      owner: { type: 'STATE', id: stateId },
    });
  } else if (payload.kind === 'REVOKE_SHARE_ACQUISITION') {
    await assertShareConsentRevocable(transaction, {
      id: payload.consentId,
      owner: { type: 'STATE', id: stateId },
    });
  } else {
    if (payload.operation.owner.type !== 'STATE' || payload.operation.owner.id !== stateId) {
      throw new DomainError(
        HTTP.forbidden,
        'STATE_SHARE_OWNER_REQUIRED',
        'Государство может передать только принадлежащие ему акции',
      );
    }
    await assertShareSettlement(transaction, payload.operation, payload.authorizationDecisionId);
  }
}
async function executeStateShareAction(
  transaction: Transaction,
  input: Readonly<{ record: DirectiveRecord; actorId: string; payload: StateShareAction }>,
): Promise<void> {
  const { record, actorId, payload } = input;
  await assertStateShareAction(transaction, record.stateId, payload);
  if (payload.kind === 'ACCEPT_SHARE_ACQUISITION') {
    await recordShareConsent(transaction, {
      operation: payload.operation,
      owner: { type: 'STATE', id: record.stateId },
      actorId: record.createdBy,
      key: record.id,
      source: { stateDirectiveId: record.id },
    });
  } else if (payload.kind === 'REVOKE_SHARE_ACQUISITION') {
    await revokeShareConsent(transaction, {
      id: payload.consentId,
      owner: { type: 'STATE', id: record.stateId },
      actorId,
      source: { stateDirectiveId: record.id },
    });
  } else {
    await settleShareTransfer(transaction, {
      operation: payload.operation,
      actorId,
      key: record.id,
      source: { stateDirectiveId: record.id },
      authorizationDecisionId: payload.authorizationDecisionId,
    });
  }
}
export { isStateShareAction, assertStateShareAction, executeStateShareAction };
