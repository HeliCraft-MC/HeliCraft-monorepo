import type {
  CompanyRegistrationPolicy,
  MonetaryDirectivePayload,
  NationalCurrency,
} from '@helicraft/alhena';
import { amountFromForm, formText } from '../monetary/model';

const COMPANY_STATE_KINDS = [
  'SET_COMPANY_REGISTRATION_POLICY',
  'REVIEW_COMPANY_REGISTRATION',
  'REVIEW_COMPANY_BRANCH',
  'CONSENT_COMPANY_FORMATION',
  'VOTE_AS_SHAREHOLDER',
  'ACCEPT_SHARE_ACQUISITION',
  'REVOKE_SHARE_ACQUISITION',
  'TRANSFER_COMPANY_SHARES',
] as const;
type CompanyStatePayload = Extract<
  MonetaryDirectivePayload,
  { kind: (typeof COMPANY_STATE_KINDS)[number] }
>;
const UNCONFIGURED_COMPANY_POLICY: CompanyRegistrationPolicy = {
  companyMode: 'APPROVAL',
  foreignPlayerFounders: 'DENY',
  corporateFounders: 'DENY',
  stateFounders: 'DENY',
  branchMode: 'DENY',
  foreignBranches: 'DENY',
  registrationFee: null,
};
function isCompanyStatePayload(payload: MonetaryDirectivePayload): payload is CompanyStatePayload {
  return COMPANY_STATE_KINDS.some((kind) => kind === payload.kind);
}
function allowDeny(value: string): 'ALLOW' | 'DENY' {
  if (value === 'ALLOW' || value === 'DENY') {
    return value;
  }
  throw new Error('Invalid foreign founder policy');
}
function founderPolicy(value: string): CompanyRegistrationPolicy['corporateFounders'] {
  if (value === 'ALLOW' || value === 'DOMESTIC_ONLY' || value === 'DENY') {
    return value;
  }
  throw new Error('Invalid founder policy');
}
function registrationPolicyForm(
  form: FormData,
  currency: NationalCurrency | null,
): CompanyRegistrationPolicy {
  const companyMode = formText(form, 'companyMode');
  const branchMode = formText(form, 'branchMode');
  if (
    (companyMode !== 'FREE' && companyMode !== 'APPROVAL') ||
    (branchMode !== 'FREE' && branchMode !== 'APPROVAL' && branchMode !== 'DENY')
  ) {
    throw new Error('Invalid registration policy');
  }
  const hasFee = form.has('hasFee');
  if (hasFee && (currency === null || currency.status !== 'ACTIVE')) {
    throw new Error('Choose an active fee currency');
  }
  return {
    companyMode,
    branchMode,
    foreignPlayerFounders: allowDeny(formText(form, 'foreignPlayerFounders')),
    corporateFounders: founderPolicy(formText(form, 'corporateFounders')),
    stateFounders: founderPolicy(formText(form, 'stateFounders')),
    foreignBranches: allowDeny(formText(form, 'foreignBranches')),
    registrationFee:
      hasFee && currency !== null
        ? { currencyId: currency.id, amountMinor: amountFromForm(form, 'registrationFee') }
        : null,
  };
}
export {
  COMPANY_STATE_KINDS,
  UNCONFIGURED_COMPANY_POLICY,
  isCompanyStatePayload,
  registrationPolicyForm,
  type CompanyStatePayload,
};
