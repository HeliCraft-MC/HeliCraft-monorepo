import { createHash } from 'node:crypto';
import { canonicalJson } from '../states/configuration-hash';
import type { Policy } from '../states/contracts';
import { DomainError, HTTP } from '../errors';
import type { DirectivePayload, MonetaryPolicy } from './contracts';

const MAX_MINOR = 999_999_999_999_999_999_999_999_999_999n;
const ROLLING_WINDOW_MS = 2_592_000_000;
const ACTIONS = {
  ESTABLISH_BANK: 'ESTABLISH_CENTRAL_BANK',
  CHANGE_CHARTER: 'CHANGE_BANK_CHARTER',
  CREATE_CURRENCY: 'CREATE_CURRENCY',
  CHANGE_POLICY: 'CHANGE_MONETARY_POLICY',
  ISSUE: 'ISSUE_CURRENCY',
  BURN: 'BURN_CURRENCY',
  BANK_TRANSFER: 'TRANSFER_CENTRAL_BANK',
  TREASURY_TRANSFER: 'SPEND_TREASURY',
} satisfies Partial<Record<DirectivePayload['kind'], Policy['action']>>;
const DECISION_ACTIONS = {
  CHANGE_TERRITORY: 'CHANGE_TERRITORY',
  ...ACTIONS,
  PUBLISH_FX_OFFER: 'MANAGE_FX_OFFERS',
  CANCEL_FX_OFFER: 'CANCEL_FX_OFFERS',
  APPROVE_INTERBANK_EXCHANGE: 'APPROVE_INTERBANK_EXCHANGE',
  ESTABLISH_TAX_OFFICE: 'ESTABLISH_TAX_OFFICE',
  CHANGE_TAX_CHARTER: 'CHANGE_TAX_OFFICE_CHARTER',
  ENACT_TAX_LAW: 'ENACT_LAW',
  AMEND_TAX_LAW: 'AMEND_TAX_LAW',
  REPEAL_TAX_LAW: 'REPEAL_LAW',
  RATIFY_TREATY: 'SIGN_TREATY',
  AMEND_TREATY: 'AMEND_TREATY',
  REJECT_TREATY: 'SIGN_TREATY',
  DENOUNCE_TREATY: 'DENOUNCE_TREATY',
  SET_COMPANY_REGISTRATION_POLICY: 'SET_COMPANY_REGISTRATION_POLICY',
  REVIEW_COMPANY_REGISTRATION: 'REGISTER_COMPANY',
  REVIEW_COMPANY_BRANCH: 'REGISTER_COMPANY_BRANCH',
  CONSENT_COMPANY_FORMATION: 'PARTICIPATE_IN_COMPANY',
  VOTE_AS_SHAREHOLDER: 'PARTICIPATE_IN_COMPANY',
  ACCEPT_SHARE_ACQUISITION: 'ACQUIRE_COMPANY_SHARES',
  REVOKE_SHARE_ACQUISITION: 'ACQUIRE_COMPANY_SHARES',
  TRANSFER_COMPANY_SHARES: 'TRANSFER_COMPANY_SHARES',
} satisfies Record<DirectivePayload['kind'], Policy['action']>;
function decisionPolicy(
  policies: readonly Policy[],
  kind: DirectivePayload['kind'],
): Policy | undefined {
  if (kind === 'ESTABLISH_BANK' || kind === 'ESTABLISH_TAX_OFFICE') {
    const shared = policies.find((policy) => policy.action === 'CREATE_INSTITUTION');
    if (shared) {
      return shared;
    }
  }
  return policies.find((policy) => policy.action === DECISION_ACTIONS[kind]);
}
function monetaryHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}
function monetaryError(code: string, message: string): never {
  throw new DomainError(HTTP.conflict, code, message);
}
function assertIssuance(
  policy: MonetaryPolicy | null,
  input: Readonly<{ amount: bigint; supply: bigint; gross: bigint }>,
): void {
  if (policy === null) {
    monetaryError('POLICY_REQUIRED', 'Сначала утвердите денежную политику');
  }
  const { amount, supply, gross } = input;
  if (amount <= 0n || supply + amount > MAX_MINOR) {
    monetaryError('MONEY_RANGE', 'Сумма выходит за технический диапазон');
  }
  const checks = [
    [policy.maxSupplyMinor, supply + amount],
    [policy.maxGrossIssuance30dMinor, gross + amount],
    [policy.maxIssuancePerOperationMinor, amount],
  ] as const;
  if (checks.some(([limit, value]) => limit !== null && value > BigInt(limit))) {
    monetaryError('ISSUANCE_LIMIT', 'Превышен утверждённый лимит эмиссии');
  }
}
export {
  decisionPolicy,
  ACTIONS,
  DECISION_ACTIONS,
  MAX_MINOR,
  ROLLING_WINDOW_MS,
  monetaryHash,
  monetaryError,
  assertIssuance,
};
