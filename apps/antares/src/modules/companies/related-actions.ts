import type { Transaction } from '../permissions/transaction';
import type { CompanyDecisionPayload } from './decision-contracts';
import type { CompanyProofs } from './decision-proofs';
import {
  isCorporateBranchAction,
  assertCorporateBranchAction,
  executeCorporateBranchAction,
} from './branch-execution';
import type { CorporateBranchAction } from './branch-execution';
import {
  isCorporateShareAction,
  assertCorporateShareAction,
  executeCorporateShareAction,
} from './share-actions';
import type { CorporateShareAction } from './share-actions';
import { assertCorporatePayment, executeCorporatePayment } from './payment';

type RelatedCompanyAction =
  | CorporateBranchAction
  | CorporateShareAction
  | Extract<CompanyDecisionPayload, { kind: 'TRANSFER_FUNDS' }>;
function isRelatedCompanyAction(payload: CompanyDecisionPayload): payload is RelatedCompanyAction {
  return (
    isCorporateBranchAction(payload) ||
    isCorporateShareAction(payload) ||
    payload.kind === 'TRANSFER_FUNDS'
  );
}
async function assertRelatedCompanyAction(
  transaction: Transaction,
  companyId: string,
  payload: RelatedCompanyAction,
): Promise<void> {
  if (isCorporateBranchAction(payload)) {
    await assertCorporateBranchAction(transaction, companyId, payload);
    return;
  }
  if (isCorporateShareAction(payload)) {
    await assertCorporateShareAction(transaction, companyId, payload);
    return;
  }
  await assertCorporatePayment(transaction, companyId, payload);
}
async function executeRelatedCompanyAction(
  transaction: Transaction,
  input: Readonly<{ proof: CompanyProofs; payload: RelatedCompanyAction; actorId: string }>,
): Promise<void> {
  const { proof, payload, actorId } = input;
  if (isCorporateBranchAction(payload)) {
    await executeCorporateBranchAction(transaction, { proof, payload, actorId });
    return;
  }
  if (isCorporateShareAction(payload)) {
    await executeCorporateShareAction(transaction, { proof, payload, actorId });
    return;
  }
  await executeCorporatePayment(transaction, { proof, payload, actorId });
}
export { isRelatedCompanyAction, assertRelatedCompanyAction, executeRelatedCompanyAction };
