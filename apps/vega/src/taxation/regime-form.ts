import type { TaxRule } from '@helicraft/alhena';
import { formText } from '../monetary/model';

function taxRegimeFromForm(form: FormData): TaxRule['regime'] {
  const mode = formText(form, 'regimeMode');
  if (mode === '' || mode === 'NONE') {
    return undefined;
  }
  if (mode !== 'EXEMPT' && mode !== 'REPLACE' && mode !== 'ADDITIONAL') {
    throw new Error('Invalid company treatment');
  }
  const companyId = formText(form, 'regimeCompanyId');
  const branchId =
    formText(form, 'regimeScope') === 'BRANCH' ? formText(form, 'regimeBranchId') : null;
  const targetLawId = mode === 'ADDITIONAL' ? null : formText(form, 'regimeTargetLawId');
  if (companyId === '' || branchId === '' || targetLawId === '') {
    throw new Error('Select actual company, branch and national claim');
  }
  return { mode, companyId, branchId, targetLawId };
}
export { taxRegimeFromForm };
