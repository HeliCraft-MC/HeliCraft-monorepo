import { monetaryError } from '../monetary/domain';
import type { FxOfferTerms, InterbankTerms } from './contracts';

const MAX_MINOR = 999_999_999_999_999_999_999_999_999_999n;
function exactLotAmount(perLotMinor: string, lots: string): string {
  const amount = BigInt(perLotMinor) * BigInt(lots);
  if (amount <= 0n || amount > MAX_MINOR) {
    monetaryError('FX_AMOUNT_LIMIT', 'Сумма обмена вне допустимого точного диапазона');
  }
  return amount.toString();
}
function assertOfferTerms(terms: FxOfferTerms, now = new Date()): void {
  if (terms.receiveCurrencyId === terms.provideCurrencyId) {
    monetaryError('FX_SAME_CURRENCY', 'Для обмена требуются две разные валюты');
  }
  if (BigInt(terms.minimumLots) > BigInt(terms.totalLots)) {
    monetaryError('FX_LOT_LIMIT', 'Минимальный размер не может превышать весь объём');
  }
  if (new Date(terms.expiresAt) <= now) {
    monetaryError('FX_EXPIRED', 'Срок предложения истёк');
  }
  exactLotAmount(terms.receivePerLotMinor, terms.totalLots);
  exactLotAmount(terms.providePerLotMinor, terms.totalLots);
}
function offerAmounts(
  terms: FxOfferTerms,
  lots: string,
  remainingLots: string,
): { receiveMinor: string; provideMinor: string } {
  if (BigInt(lots) < BigInt(terms.minimumLots) || BigInt(lots) > BigInt(remainingLots)) {
    monetaryError(
      'FX_LOTS_UNAVAILABLE',
      'Размер обмена меньше минимума или превышает доступный остаток',
    );
  }
  return {
    receiveMinor: exactLotAmount(terms.receivePerLotMinor, lots),
    provideMinor: exactLotAmount(terms.providePerLotMinor, lots),
  };
}
function assertInterbankTerms(terms: InterbankTerms, now = new Date()): void {
  if (terms.first.stateId === terms.second.stateId || terms.first.bankId === terms.second.bankId) {
    monetaryError('FX_SAME_BANK', 'Межбанковская сделка требует двух разных Центральных банков');
  }
  if (terms.first.currencyId === terms.second.currencyId) {
    monetaryError('FX_SAME_CURRENCY', 'Для обмена требуются две разные валюты');
  }
  if (new Date(terms.expiresAt) <= now) {
    monetaryError('FX_EXPIRED', 'Срок сделки истёк');
  }
}
export { exactLotAmount, assertOfferTerms, offerAmounts, assertInterbankTerms };
