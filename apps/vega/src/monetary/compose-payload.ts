import type {
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
// oxlint-disable-next-line max-lines-per-function -- The form maps distinct typed command fields; financial authorization and policy checks stay in Antares.
function composePayload(
  input: Readonly<{
    kind: DirectiveKind;
    form: FormData;
    name: LocalizedInput;
    description: LocalizedInput;
    currencyId: string | null;
    players: SelectedPlayer[];
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
  const type = form.get('recipientType');
  if (type === 'TREASURY' || type === 'CENTRAL_BANK') {
    return { kind, ...financial, recipient: { type } };
  }
  const [player] = players;
  if (players.length !== 1 || !player) {
    throw new Error('Choose one recipient');
  }
  return { kind, ...financial, recipient: { type: 'PLAYER', userId: player.id } };
}
export { composePayload };
