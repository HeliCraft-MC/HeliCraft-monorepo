import { and, eq, sql } from 'drizzle-orm';
import { fxExchanges, fxOffers, fxOfferEvents, fxQuotes } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryHash, monetaryError } from '../monetary/domain';
import { assertOfferTerms, offerAmounts } from './domain';
import { activeFxBank, activeFxCurrency, offerRecord } from './store';
import { settleFx } from './settlement';
import type { FxSettlement } from './settlement';
import type { FxFillInput } from './contracts';

const QUOTE_LIFETIME_MS = 120_000;
async function quoteOffer(
  transaction: Transaction,
  input: Readonly<{ offerId: string; actorId: string; lots: string }>,
): Promise<typeof fxQuotes.$inferSelect> {
  const { offerId, actorId, lots } = input;
  const offer = await offerRecord(transaction, offerId);
  if (offer.status !== 'ACTIVE') {
    monetaryError('FX_OFFER_INACTIVE', 'Валютное предложение уже закрыто');
  }
  assertOfferTerms(offer.terms);
  await activeFxBank(transaction, offer.stateId, offer.bankId);
  await activeFxCurrency(transaction, offer.receiveCurrencyId);
  await activeFxCurrency(transaction, offer.provideCurrencyId);
  const amounts = offerAmounts(offer.terms, lots, offer.remainingLots);
  const [quote] = await transaction
    .insert(fxQuotes)
    .values({
      offerId,
      actorId,
      termsHash: offer.termsHash,
      lots,
      ...amounts,
      expiresAt: new Date(Math.min(offer.expiresAt.getTime(), Date.now() + QUOTE_LIFETIME_MS)),
    })
    .returning();
  if (!quote) {
    throw new Error('FX quote missing');
  }
  return quote;
}
async function confirmedOffer(
  transaction: Transaction,
  input: Readonly<{ offerId: string; actorId: string; quoteId: string }>,
): Promise<{ offer: typeof fxOffers.$inferSelect; quote: typeof fxQuotes.$inferSelect }> {
  const { offerId, actorId } = input;
  const [quote] = await transaction.select().from(fxQuotes).where(eq(fxQuotes.id, input.quoteId));
  if (
    !quote ||
    quote.actorId !== actorId ||
    quote.offerId !== offerId ||
    quote.expiresAt.getTime() <= Date.now()
  ) {
    monetaryError('FX_QUOTE_STALE', 'Подтверждённый расчёт не найден или его срок истёк');
  }
  const [used] = await transaction
    .select({ id: fxExchanges.id })
    .from(fxExchanges)
    .where(eq(fxExchanges.quoteId, quote.id));
  if (used) {
    monetaryError('FX_QUOTE_USED', 'Этот расчёт уже исполнен');
  }
  const offer = await offerRecord(transaction, offerId);
  assertOfferTerms(offer.terms);
  if (offer.status !== 'ACTIVE' || offer.termsHash !== quote.termsHash) {
    monetaryError('FX_OFFER_STALE', 'Предложение закрыто или условия расчёта изменились');
  }
  await activeFxBank(transaction, offer.stateId, offer.bankId);
  const amounts = offerAmounts(offer.terms, quote.lots, offer.remainingLots);
  if (amounts.receiveMinor !== quote.receiveMinor || amounts.provideMinor !== quote.provideMinor) {
    monetaryError('FX_QUOTE_INTEGRITY', 'Суммы не совпадают с подтверждёнными условиями');
  }
  return { offer, quote };
}
function offerSettlement(
  input: Readonly<{
    offer: typeof fxOffers.$inferSelect;
    quote: typeof fxQuotes.$inferSelect;
    id: string;
    actorId: string;
    key: string;
    hash: string;
  }>,
): FxSettlement {
  const { offer, quote, id, actorId, key, hash } = input;
  return {
    id,
    actorId,
    key,
    hash,
    source: { offerId: offer.id, quoteId: quote.id },
    receive: {
      currencyId: offer.receiveCurrencyId,
      amountMinor: quote.receiveMinor,
      from: { kind: 'PLAYER', id: actorId },
      to: { kind: 'CENTRAL_BANK', id: offer.bankId },
    },
    provide: {
      currencyId: offer.provideCurrencyId,
      amountMinor: quote.provideMinor,
      from: { kind: 'CENTRAL_BANK', id: offer.bankId },
      to: { kind: 'PLAYER', id: actorId },
    },
  };
}
async function fillOffer(
  transaction: Transaction,
  request: Readonly<{ offerId: string; actorId: string; command: FxFillInput }>,
): Promise<string> {
  const { offerId, actorId, command: input } = request;
  const hash = monetaryHash({ offerId, quoteId: input.quoteId });
  const [previous] = await transaction
    .select()
    .from(fxExchanges)
    .where(
      and(eq(fxExchanges.actorId, actorId), eq(fxExchanges.idempotencyKey, input.idempotencyKey)),
    );
  if (previous) {
    if (previous.commandHash !== hash) {
      monetaryError('IDEMPOTENCY_CONFLICT', 'Этот ключ уже использован для другого обмена');
    }
    return previous.id;
  }
  const { offer, quote } = await confirmedOffer(transaction, {
    offerId,
    actorId,
    quoteId: input.quoteId,
  });
  const id = crypto.randomUUID();
  const remaining = (BigInt(offer.remainingLots) - BigInt(quote.lots)).toString();
  await transaction
    .update(fxOffers)
    .set({
      remainingLots: remaining,
      status: remaining === '0' ? 'FILLED' : 'ACTIVE',
      databaseTransaction: sql`pg_current_xact_id()::text`,
    })
    .where(eq(fxOffers.id, offerId));
  await settleFx(
    transaction,
    offerSettlement({ offer, quote, id, actorId, key: input.idempotencyKey, hash }),
  );
  await transaction.insert(fxOfferEvents).values({
    offerId,
    kind: 'FILL',
    remainingBefore: offer.remainingLots,
    remainingAfter: remaining,
    exchangeId: id,
    actorId,
  });
  return id;
}
export { quoteOffer, fillOffer };
