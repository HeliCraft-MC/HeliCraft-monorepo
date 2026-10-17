import type {
  LocalizedInput,
  MonetaryDirectivePayload,
  TaxLawRevision,
  TaxRule,
} from '@helicraft/alhena';
import { formText } from '../monetary/model';

type TaxKind =
  | 'ESTABLISH_TAX_OFFICE'
  | 'CHANGE_TAX_CHARTER'
  | 'ENACT_TAX_LAW'
  | 'AMEND_TAX_LAW'
  | 'REPEAL_TAX_LAW';
function taxRuleFromForm(form: FormData): TaxRule {
  const basis = formText(form, 'basis');
  return {
    event: 'PLAYER_TRANSFER',
    category: formText(form, 'category'),
    taxpayer: 'SENDER',
    jurisdictions:
      basis === 'BOTH'
        ? ['CITIZENSHIP', 'TERRITORIAL']
        : [basis === 'TERRITORIAL' ? 'TERRITORIAL' : 'CITIZENSHIP'],
    rateBps: Number(formText(form, 'rateBps')),
    recipient: 'STATE_TREASURY',
    currencyIds: [],
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
  }>,
): MonetaryDirectivePayload {
  const { kind, form, name, description, document, revision } = input;
  if (kind === 'ESTABLISH_TAX_OFFICE' || kind === 'CHANGE_TAX_CHARTER') {
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
