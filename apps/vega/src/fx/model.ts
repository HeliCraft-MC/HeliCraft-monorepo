import type {
  MonetaryDirectivePayload,
  FxOffer,
  StateDetail,
  StateMonetary,
} from '@helicraft/alhena';
import { amountFromForm, formText } from '../monetary/model';

type FxPayload = Extract<
  MonetaryDirectivePayload,
  { kind: 'PUBLISH_FX_OFFER' | 'CANCEL_FX_OFFER' | 'APPROVE_INTERBANK_EXCHANGE' }
>;
function isFxPayload(payload: MonetaryDirectivePayload): payload is FxPayload {
  return (
    payload.kind === 'PUBLISH_FX_OFFER' ||
    payload.kind === 'CANCEL_FX_OFFER' ||
    payload.kind === 'APPROVE_INTERBANK_EXCHANGE'
  );
}
function wholeLots(form: FormData, key: string): string {
  const value = formText(form, key);
  if (!/^[1-9][0-9]{0,29}$/u.test(value)) {
    throw new TypeError('Positive whole lots required');
  }
  return value;
}
function expiryFromForm(form: FormData): string {
  const date = new Date(formText(form, 'expiresAt'));
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError('Expiry required');
  }
  return date.toISOString();
}
function offerPayload(form: FormData): Extract<FxPayload, { kind: 'PUBLISH_FX_OFFER' }> {
  return {
    kind: 'PUBLISH_FX_OFFER',
    offerId: crypto.randomUUID(),
    terms: {
      receiveCurrencyId: formText(form, 'receiveCurrencyId'),
      provideCurrencyId: formText(form, 'provideCurrencyId'),
      receivePerLotMinor: amountFromForm(form, 'receivePerLot'),
      providePerLotMinor: amountFromForm(form, 'providePerLot'),
      minimumLots: wholeLots(form, 'minimumLots'),
      totalLots: wholeLots(form, 'totalLots'),
      expiresAt: expiryFromForm(form),
    },
  };
}
function interbankPayload(
  form: FormData,
  input: Readonly<{ state: StateDetail; monetary: StateMonetary; partner: FxOffer['bank'] | null }>,
): Extract<FxPayload, { kind: 'APPROVE_INTERBANK_EXCHANGE' }> {
  if (input.monetary.bank === null || input.partner === null || !input.partner.available) {
    throw new TypeError('Choose the actual active banks');
  }
  return {
    kind: 'APPROVE_INTERBANK_EXCHANGE',
    tradeId: crypto.randomUUID(),
    terms: {
      first: {
        stateId: input.state.id,
        bankId: input.monetary.bank.id,
        currencyId: formText(form, 'firstCurrencyId'),
        amountMinor: amountFromForm(form, 'firstAmount'),
      },
      second: {
        stateId: input.partner.stateId,
        bankId: input.partner.id,
        currencyId: formText(form, 'secondCurrencyId'),
        amountMinor: amountFromForm(form, 'secondAmount'),
      },
      expiresAt: expiryFromForm(form),
    },
  };
}
export { isFxPayload, offerPayload, interbankPayload, expiryFromForm, type FxPayload };
