import type {
  PublishedCompanyIdentity,
  GovernancePolicy,
  LocalizedInput,
  MonetaryDirectivePayload,
  MonetaryPolicy,
} from '@helicraft/alhena';
import { moneyInputToMinor } from '@helicraft/atria';
import type { SelectedPlayer } from '../player-picker';
import { amountFromForm, formText } from './model';
import type { DirectiveKind } from './model';

function readLimit(form: FormData, key: string): string | null {
  if (form.get(`${key}Mode`) === 'UNLIMITED') {
    return null;
  }
  const minor = moneyInputToMinor(formText(form, key));
  if (form.get(`${key}Mode`) !== 'LIMITED' || minor === null) {
    throw new Error('Choose an explicit limit');
  }
  return minor;
}
function directiveCurrencyId(
  input: Readonly<{
    kind: DirectiveKind;
    form: FormData;
    nationalId: string | null;
    allowedCurrencyIds: readonly string[];
  }>,
): string | null {
  if (input.kind !== 'BANK_TRANSFER' && input.kind !== 'TREASURY_TRANSFER') {
    return input.nationalId;
  }
  const id = formText(input.form, 'currencyId');
  if (!input.allowedCurrencyIds.includes(id)) {
    throw new Error('Select a held active currency');
  }
  return id;
}
type OfficialRecipient = Extract<MonetaryDirectivePayload, { kind: 'BANK_TRANSFER' }>['recipient'];
function recipientFromForm(
  input: Readonly<{
    form: FormData;
    players: readonly SelectedPlayer[];
    company?: PublishedCompanyIdentity | null;
  }>,
): OfficialRecipient {
  const { form, players, company } = input;
  const type = form.get('recipientType');
  if (type === 'TREASURY' || type === 'CENTRAL_BANK') {
    return { type };
  }
  if (type === 'COMPANY') {
    if (company === undefined || company === null) {
      throw new Error('Choose one registered company');
    }
    return { type: 'COMPANY', companyId: company.id };
  }
  if (type !== 'PLAYER') {
    throw new Error('Choose a supported recipient type');
  }
  const [player] = players;
  if (players.length !== 1 || !player) {
    throw new Error('Choose one recipient');
  }
  return { type: 'PLAYER', userId: player.id };
}
// oxlint-disable-next-line max-lines-per-function -- The form maps distinct typed command fields; financial authorization and policy checks stay in Antares.
function composePayload(
  input: Readonly<{
    kind: DirectiveKind;
    form: FormData;
    name: LocalizedInput;
    description: LocalizedInput;
    currencyId: string | null;
    players: SelectedPlayer[];
    company?: PublishedCompanyIdentity | null;
    initialPolicies?: GovernancePolicy[];
  }>,
): MonetaryDirectivePayload {
  const { kind, form, name, description, currencyId, players } = input;
  if (kind === 'ESTABLISH_BANK' || kind === 'CHANGE_CHARTER') {
    return kind === 'ESTABLISH_BANK'
      ? { kind, name, description, initialPolicies: input.initialPolicies }
      : { kind, name, description };
  }
  if (kind === 'CREATE_CURRENCY') {
    return {
      kind,
      name,
      description,
      code: formText(form, 'code').trim().toUpperCase(),
    };
  }
  if (currencyId === null) {
    throw new Error('Currency required');
  }
  if (kind === 'CHANGE_POLICY') {
    const policy: MonetaryPolicy = {
      maxSupplyMinor: readLimit(form, 'maxSupplyMinor'),
      maxGrossIssuance30dMinor: readLimit(form, 'maxGrossIssuance30dMinor'),
      maxIssuancePerOperationMinor: readLimit(form, 'maxIssuancePerOperationMinor'),
    };
    return { kind, currencyId, policy };
  }
  const financial = {
    amountMinor: amountFromForm(form, 'amount'),
    purpose: formText(form, 'purpose'),
    currencyId,
  };
  if (kind === 'ISSUE' || kind === 'BURN') {
    return { kind, ...financial };
  }
  return {
    kind,
    ...financial,
    recipient: recipientFromForm({ form, players, company: input.company }),
  };
}
export { composePayload, directiveCurrencyId };
