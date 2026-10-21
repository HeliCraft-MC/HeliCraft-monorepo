import type { CompanyDecisionPayload, LegalOwner } from '@helicraft/alhena';
import { amountFromForm, formText } from '../monetary/model';

type CompanyPayment = Extract<CompanyDecisionPayload, { kind: 'TRANSFER_FUNDS' }>;
function companyPayment(form: FormData, recipient: LegalOwner | null): CompanyPayment {
  if (recipient === null) {
    throw new Error('Recipient required');
  }
  const branchId = formText(form, 'sourceBranchId');
  return {
    kind: 'TRANSFER_FUNDS',
    recipient,
    currencyId: formText(form, 'currencyId'),
    amountMinor: amountFromForm(form, 'amount'),
    purpose: formText(form, 'purpose').trim(),
    ...(branchId === '' ? {} : { sourceBranchId: branchId }),
  };
}
export { companyPayment };
