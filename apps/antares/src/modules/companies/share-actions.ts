import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import type { CompanyDecisionPayload } from './decision-contracts';
import type { ShareOperation } from './ownership-contracts';
import type { CompanyProofs } from './decision-proofs';
import { assertRegisteredOperation, shareOperationContext } from './share-context';
import { assertShareSettlement, settleShareIssue, settleShareTransfer } from './share-settlement';
import {
  assertAcquisitionRecipient,
  recordShareConsent,
  assertShareConsentRevocable,
  revokeShareConsent,
} from './share-consents';

type CorporateShareAction = Extract<
  CompanyDecisionPayload,
  {
    kind:
      | 'ISSUE_SHARES'
      | 'AUTHORIZE_SHARE_TRANSFER'
      | 'TRANSFER_OWNED_SHARES'
      | 'ACCEPT_SHARE_ACQUISITION'
      | 'REVOKE_SHARE_ACQUISITION';
  }
>;
function isCorporateShareAction(payload: CompanyDecisionPayload): payload is CorporateShareAction {
  return (
    payload.kind === 'ISSUE_SHARES' ||
    payload.kind === 'AUTHORIZE_SHARE_TRANSFER' ||
    payload.kind === 'TRANSFER_OWNED_SHARES' ||
    payload.kind === 'ACCEPT_SHARE_ACQUISITION' ||
    payload.kind === 'REVOKE_SHARE_ACQUISITION'
  );
}
async function assertIssuerAction(
  transaction: Transaction,
  companyId: string,
  payload: Extract<CorporateShareAction, { kind: 'ISSUE_SHARES' | 'AUTHORIZE_SHARE_TRANSFER' }>,
): Promise<void> {
  if (payload.operation.issuerId !== companyId) {
    throw new DomainError(
      HTTP.forbidden,
      'SHARE_ISSUER_AUTHORITY_REQUIRED',
      'Выпуск или одобрение передачи принимает эмитент акций',
    );
  }
  if (payload.kind === 'ISSUE_SHARES') {
    await assertShareSettlement(transaction, payload.operation, null);
  } else {
    await assertRegisteredOperation(transaction, payload.operation);
    await shareOperationContext(transaction, payload.operation);
  }
}
async function assertCorporateShareAction(
  transaction: Transaction,
  companyId: string,
  payload: CorporateShareAction,
): Promise<void> {
  switch (payload.kind) {
    case 'ISSUE_SHARES':
    case 'AUTHORIZE_SHARE_TRANSFER': {
      await assertIssuerAction(transaction, companyId, payload);
      return;
    }
    case 'TRANSFER_OWNED_SHARES': {
      if (payload.operation.owner.type !== 'COMPANY' || payload.operation.owner.id !== companyId) {
        throw new DomainError(
          HTTP.forbidden,
          'CORPORATE_SHARE_OWNER_REQUIRED',
          'Компания может распорядиться только принадлежащими ей акциями',
        );
      }
      await assertShareSettlement(transaction, payload.operation, payload.authorizationDecisionId);
      return;
    }
    case 'ACCEPT_SHARE_ACQUISITION': {
      await assertAcquisitionRecipient(transaction, {
        operation: payload.operation,
        owner: { type: 'COMPANY', id: companyId },
      });
      return;
    }
    case 'REVOKE_SHARE_ACQUISITION': {
      await assertShareConsentRevocable(transaction, {
        id: payload.consentId,
        owner: { type: 'COMPANY', id: companyId },
      });
      return;
    }
    default: {
      throw new Error('Unknown corporate share action');
    }
  }
}
async function acceptShares(
  transaction: Transaction,
  proof: CompanyProofs,
  operation: ShareOperation,
): Promise<void> {
  await recordShareConsent(transaction, {
    operation,
    owner: { type: 'COMPANY', id: proof.company.id },
    actorId: proof.record.createdBy,
    key: proof.record.id,
    source: { companyDecisionId: proof.record.id },
  });
}
interface ShareExecution {
  readonly proof: CompanyProofs;
  readonly payload: CorporateShareAction;
  readonly actorId: string;
}
async function executeCorporateShareAction(
  transaction: Transaction,
  input: ShareExecution,
): Promise<void> {
  const { proof, payload, actorId } = input;
  const companyId = proof.company.id;
  await assertCorporateShareAction(transaction, companyId, payload);
  if (payload.kind === 'AUTHORIZE_SHARE_TRANSFER') {
    return;
  }
  switch (payload.kind) {
    case 'ISSUE_SHARES': {
      await settleShareIssue(transaction, {
        operation: payload.operation,
        actorId,
        decisionId: proof.record.id,
      });
      return;
    }
    case 'TRANSFER_OWNED_SHARES': {
      await settleShareTransfer(transaction, {
        operation: payload.operation,
        actorId,
        key: proof.record.id,
        source: { companyDecisionId: proof.record.id },
        authorizationDecisionId: payload.authorizationDecisionId,
      });
      return;
    }
    case 'ACCEPT_SHARE_ACQUISITION': {
      await acceptShares(transaction, proof, payload.operation);
      return;
    }
    case 'REVOKE_SHARE_ACQUISITION': {
      await revokeShareConsent(transaction, {
        id: payload.consentId,
        owner: { type: 'COMPANY', id: companyId },
        actorId,
        source: { companyDecisionId: proof.record.id },
      });
      return;
    }
    default: {
      throw new Error('Unknown corporate share action');
    }
  }
}
export {
  isCorporateShareAction,
  assertCorporateShareAction,
  executeCorporateShareAction,
  type CorporateShareAction,
};
