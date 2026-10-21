import { decisionPolicy } from '../states/decision-policy';
import type {
  MonetaryDirectivePayload,
  GovernancePolicy,
  StateDetail,
  StateMonetary,
} from '@helicraft/alhena';
import { moneyInputToMinor } from '@helicraft/atria';

const actionCodes = {
  ESTABLISH_BANK: 'ESTABLISH_CENTRAL_BANK',
  CHANGE_CHARTER: 'CHANGE_BANK_CHARTER',
  CREATE_CURRENCY: 'CREATE_CURRENCY',
  CHANGE_POLICY: 'CHANGE_MONETARY_POLICY',
  ISSUE: 'ISSUE_CURRENCY',
  BURN: 'BURN_CURRENCY',
  BANK_TRANSFER: 'TRANSFER_CENTRAL_BANK',
  TREASURY_TRANSFER: 'SPEND_TREASURY',
} satisfies Partial<Record<MonetaryDirectivePayload['kind'], GovernancePolicy['action']>>;
type DirectiveKind = keyof typeof actionCodes;
const kinds = Object.keys(actionCodes).filter((key): key is DirectiveKind =>
  Object.hasOwn(actionCodes, key),
);
function isDirectiveKind(value: string): value is DirectiveKind {
  return kinds.some((kind) => kind === value);
}
function institutionAllows(kind: DirectiveKind, monetary: StateMonetary): boolean {
  if (kind === 'ESTABLISH_BANK') {
    return monetary.bank === null || monetary.bank.status === 'REJECTED';
  }
  if (monetary.bank?.status !== 'ACTIVE') {
    return false;
  }
  if (kind === 'CHANGE_CHARTER') {
    return true;
  }
  if (kind === 'BANK_TRANSFER' || kind === 'TREASURY_TRANSFER') {
    return monetary.currencies.length > 0;
  }
  return kind === 'CREATE_CURRENCY' ? monetary.currency === null : monetary.currency !== null;
}
function availableKinds(
  state: StateDetail,
  actorId: string,
  monetary?: StateMonetary,
): DirectiveKind[] {
  if (state.status !== 'ACTIVE' || !state.citizens.some((citizen) => citizen.id === actorId)) {
    return [];
  }
  return kinds.filter((kind) => {
    if (monetary !== undefined && !institutionAllows(kind, monetary)) {
      return false;
    }
    const policy = decisionPolicy(state.configuration.governance.policies, actionCodes[kind]);
    return (
      policy !== undefined &&
      (['CITIZEN_VOTE', 'MANUAL'].includes(policy.mechanism) ||
        state.holders.some(
          (holder) => holder.userId === actorId && policy.officeIds.includes(holder.officeId),
        ))
    );
  });
}
function formText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value : '';
}
function amountFromForm(form: FormData, name: string): string {
  const minor = moneyInputToMinor(formText(form, name));
  if (minor === null || BigInt(minor) <= 0n) {
    throw new Error('Invalid amount');
  }
  return minor;
}

type MonetarySection =
  | 'bank'
  | 'currency'
  | 'monetary-policy'
  | 'issuance'
  | 'bank-finances'
  | 'treasury';

function hasLocalizedIdentity(kind: DirectiveKind): boolean {
  return kind === 'ESTABLISH_BANK' || kind === 'CHANGE_CHARTER' || kind === 'CREATE_CURRENCY';
}
function hasFinancialFields(kind: DirectiveKind): boolean {
  return (
    kind === 'ISSUE' || kind === 'BURN' || kind === 'BANK_TRANSFER' || kind === 'TREASURY_TRANSFER'
  );
}
function hasMonetaryPolicies(state: StateDetail): boolean {
  return state.configuration.governance.policies.some(
    (policy) =>
      policy.action === 'CREATE_INSTITUTION' ||
      Object.values(actionCodes).some((action) => action === policy.action),
  );
}
export {
  hasMonetaryPolicies,
  hasLocalizedIdentity,
  hasFinancialFields,
  actionCodes,
  kinds,
  isDirectiveKind,
  availableKinds,
  formText,
  amountFromForm,
  type DirectiveKind,
  type MonetarySection,
};
