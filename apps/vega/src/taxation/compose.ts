import type {
  GovernancePolicy,
  LocalizedInput,
  MonetaryDirectivePayload,
  TaxLawRevision,
  TaxRule,
} from '@helicraft/alhena';
import { moneyInputToMinor } from '@helicraft/atria';
import { formText } from '../monetary/model';
import { taxScopeFromForm } from './scope-form';
import { taxRegimeFromForm } from './regime-form';

type TaxKind =
  | 'ESTABLISH_TAX_OFFICE'
  | 'CHANGE_TAX_CHARTER'
  | 'ENACT_TAX_LAW'
  | 'AMEND_TAX_LAW'
  | 'REPEAL_TAX_LAW';
function taxRuleFromForm(form: FormData): TaxRule {
  const taxpayer = formText(form, 'taxpayer') || 'SENDER';
  const recipient = formText(form, 'taxRecipient') || 'STATE_TREASURY';
  const base = formText(form, 'taxBase') || 'FULL_AMOUNT';
  if (
    !['SENDER', 'RECIPIENT'].includes(taxpayer) ||
    !['STATE_TREASURY', 'CENTRAL_BANK'].includes(recipient) ||
    !['FULL_AMOUNT', 'EXCESS'].includes(base)
  ) {
    throw new Error('Invalid tax liability');
  }
  const thresholdMinor =
    base === 'EXCESS' ? moneyInputToMinor(formText(form, 'taxThreshold')) : '0';
  if (thresholdMinor === null) {
    throw new Error('Invalid tax allowance');
  }
  const regime = taxRegimeFromForm(form);
  return {
    ...taxScopeFromForm(form),
    category: formText(form, 'category'),
    taxpayer: taxpayer === 'RECIPIENT' ? 'RECIPIENT' : 'SENDER',
    base: base === 'EXCESS' ? { kind: 'EXCESS', thresholdMinor } : { kind: 'FULL_AMOUNT' },
    rateBps: Number(formText(form, 'rateBps')),
    recipient: recipient === 'CENTRAL_BANK' ? 'CENTRAL_BANK' : 'STATE_TREASURY',
    currencyIds: [],
    ...(regime === undefined ? {} : { regime }),
  };
}
function composeTaxPayload(
  input: Readonly<{
    kind: TaxKind;
    form: FormData;
    name: LocalizedInput;
    description: LocalizedInput;
    document: LocalizedInput;
    revision?: TaxLawRevision;
    initialPolicies?: GovernancePolicy[];
  }>,
): MonetaryDirectivePayload {
  const { kind, form, name, description, document, revision } = input;
  if (kind === 'ESTABLISH_TAX_OFFICE') {
    return { kind, name, description, initialPolicies: input.initialPolicies };
  }
  if (kind === 'CHANGE_TAX_CHARTER') {
    return { kind, name, description };
  }
  if (kind === 'REPEAL_TAX_LAW') {
    if (revision === undefined) {
      throw new Error('Select a law');
    }
    return {
      kind,
      lawId: revision.lawId,
      baseRevisionId: revision.id,
      effectiveAt: new Date(formText(form, 'repealAt')).toISOString(),
    };
  }
  const content = {
    name,
    description,
    document,
    effectiveAt: new Date(formText(form, 'effectiveAt')).toISOString(),
    rule: { ...taxRuleFromForm(form), currencyIds: revision?.rule.currencyIds ?? [] },
  };
  if (kind === 'AMEND_TAX_LAW') {
    if (revision === undefined) {
      throw new Error('Select a law');
    }
    return { kind, lawId: revision.lawId, baseRevisionId: revision.id, ...content };
  }
  return { kind, lawId: crypto.randomUUID(), ...content };
}
export { composeTaxPayload, taxRuleFromForm, type TaxKind };
