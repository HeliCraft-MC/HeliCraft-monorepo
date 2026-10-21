import { eq } from 'drizzle-orm';
import { fxOffers, fxInterbankTrades, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { bankRecord, currencyRecord } from '../monetary/store';
import { monetaryError } from '../monetary/domain';
import { DomainError, HTTP } from '../errors';

async function offerRecord(
  transaction: Transaction,
  id: string,
): Promise<typeof fxOffers.$inferSelect> {
  const [offer] = await transaction
    .select()
    .from(fxOffers)
    .where(eq(fxOffers.id, id))
    .for('update');
  if (!offer) {
    throw new DomainError(HTTP.notFound, 'FX_OFFER_NOT_FOUND', 'Валютное предложение не найдено');
  }
  return offer;
}
async function tradeRecord(
  transaction: Transaction,
  id: string,
): Promise<typeof fxInterbankTrades.$inferSelect | null> {
  const [trade] = await transaction
    .select()
    .from(fxInterbankTrades)
    .where(eq(fxInterbankTrades.id, id))
    .for('update');
  return trade ?? null;
}
async function activeFxBank(
  transaction: Transaction,
  stateId: string,
  bankId?: string,
): Promise<NonNullable<Awaited<ReturnType<typeof bankRecord>>>> {
  const bank = await bankRecord(transaction, stateId);
  const [state] = await transaction
    .select({ status: states.status })
    .from(states)
    .where(eq(states.id, stateId));
  if (
    bank?.status !== 'ACTIVE' ||
    state?.status !== 'ACTIVE' ||
    (bankId !== undefined && bank.id !== bankId)
  ) {
    monetaryError(
      'FX_BANK_INACTIVE',
      'Требуется действующий Центральный банк активного государства',
    );
  }
  return bank;
}
async function activeFxCurrency(
  transaction: Transaction,
  currencyId: string,
): Promise<Awaited<ReturnType<typeof currencyRecord>>> {
  const currency = await currencyRecord(transaction, currencyId);
  if (currency.status !== 'ACTIVE') {
    monetaryError('FX_CURRENCY_INACTIVE', 'Валюта недоступна для обмена');
  }
  return currency;
}
export { offerRecord, tradeRecord, activeFxBank, activeFxCurrency };
