import { and, eq, sql } from 'drizzle-orm';
import { fxOffers, fxOfferEvents, financialAccounts } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { DirectiveRecord } from '../monetary/store';
import { monetaryError, monetaryHash } from '../monetary/domain';
import { assertAvailableBankFunds } from './reserves';
import { assertOfferTerms, exactLotAmount } from './domain';
import { activeFxBank, activeFxCurrency, offerRecord } from './store';
import type { FxDirective } from './contracts';

async function assertOfferPublication(
  transaction: Transaction,
  stateId: string,
  payload: Extract<FxDirective, { kind: 'PUBLISH_FX_OFFER' }>,
): Promise<void> {
  assertOfferTerms(payload.terms);
  const bank = await activeFxBank(transaction, stateId);
  const [existing] = await transaction
    .select({ id: fxOffers.id })
    .from(fxOffers)
    .where(eq(fxOffers.id, payload.offerId));
  if (existing) {
    monetaryError(
      'FX_OFFER_EXISTS',
      'Идентификатор предложения уже использован. Для новых условий создайте новое предложение',
    );
  }
  await activeFxCurrency(transaction, payload.terms.receiveCurrencyId);
  await activeFxCurrency(transaction, payload.terms.provideCurrencyId);
  const [source] = await transaction
    .select({ balanceMinor: financialAccounts.balanceMinor })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.kind, 'CENTRAL_BANK'),
        eq(financialAccounts.ownerId, bank.id),
        eq(financialAccounts.currencyId, payload.terms.provideCurrencyId),
      ),
    );
  await assertAvailableBankFunds(transaction, {
    bankId: bank.id,
    currencyId: payload.terms.provideCurrencyId,
    balanceMinor: source?.balanceMinor ?? '0',
    amountMinor: exactLotAmount(payload.terms.providePerLotMinor, payload.terms.totalLots),
  });
}
async function assertOfferCancellation(
  transaction: Transaction,
  stateId: string,
  payload: Extract<FxDirective, { kind: 'CANCEL_FX_OFFER' }>,
): Promise<void> {
  const offer = await offerRecord(transaction, payload.offerId);
  if (
    offer.stateId !== stateId ||
    offer.status !== 'ACTIVE' ||
    offer.termsHash !== payload.termsHash
  ) {
    monetaryError(
      'FX_OFFER_STALE',
      'Предложение принадлежит другому государству, уже закрыто или условия изменились',
    );
  }
  await activeFxBank(transaction, stateId, offer.bankId);
}
async function publishOffer(
  transaction: Transaction,
  input: Readonly<{ record: DirectiveRecord; actorId: string }>,
  payload: Extract<FxDirective, { kind: 'PUBLISH_FX_OFFER' }>,
): Promise<void> {
  const { record, actorId } = input;
  await assertOfferPublication(transaction, record.stateId, payload);
  const bank = await activeFxBank(transaction, record.stateId);
  await transaction.insert(fxOffers).values({
    id: payload.offerId,
    stateId: record.stateId,
    bankId: bank.id,
    publishDirectiveId: record.id,
    terms: payload.terms,
    termsHash: monetaryHash(payload.terms),
    receiveCurrencyId: payload.terms.receiveCurrencyId,
    provideCurrencyId: payload.terms.provideCurrencyId,
    providePerLotMinor: payload.terms.providePerLotMinor,
    remainingLots: payload.terms.totalLots,
    expiresAt: new Date(payload.terms.expiresAt),
  });
  await transaction.insert(fxOfferEvents).values({
    offerId: payload.offerId,
    kind: 'PUBLISH',
    remainingBefore: '0',
    remainingAfter: payload.terms.totalLots,
    directiveId: record.id,
    actorId,
  });
}
async function closeOffer(
  transaction: Transaction,
  input: Readonly<{
    offerId: string;
    kind: 'CANCEL' | 'EXPIRE';
    actorId: string | null;
    directiveId?: string;
  }>,
): Promise<void> {
  const offer = await offerRecord(transaction, input.offerId);
  if (offer.status !== 'ACTIVE') {
    return;
  }
  if (input.kind === 'EXPIRE' && offer.expiresAt.getTime() > Date.now()) {
    monetaryError('FX_NOT_EXPIRED', 'Срок предложения ещё не истёк');
  }
  await transaction
    .update(fxOffers)
    .set({
      status: input.kind === 'CANCEL' ? 'CANCELLED' : 'EXPIRED',
      databaseTransaction: sql`pg_current_xact_id()::text`,
    })
    .where(eq(fxOffers.id, offer.id));
  await transaction.insert(fxOfferEvents).values({
    offerId: offer.id,
    kind: input.kind,
    remainingBefore: offer.remainingLots,
    remainingAfter: offer.remainingLots,
    directiveId: input.directiveId ?? null,
    actorId: input.actorId,
  });
}
export { assertOfferPublication, assertOfferCancellation, publishOffer, closeOffer };
