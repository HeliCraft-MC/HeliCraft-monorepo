import { desc, eq } from 'drizzle-orm';
import { fxExchanges, fxExchangeJournals, fxInterbankApprovals } from '../../db/schema';
import type { fxOffers, fxInterbankTrades } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { FxOffer, FxReceipt, InterbankTrade } from './read-contracts';
import { fxBankIdentity, fxCurrency } from './display';

const PAGE_SIZE = 20;
async function fxOfferDto(
  transaction: Transaction,
  offer: typeof fxOffers.$inferSelect,
): Promise<FxOffer> {
  const status =
    offer.status === 'ACTIVE' && offer.expiresAt.getTime() <= Date.now() ? 'EXPIRED' : offer.status;
  const bank = await fxBankIdentity(transaction, offer.bankId);
  const currencies = [
    await fxCurrency(transaction, offer.receiveCurrencyId),
    await fxCurrency(transaction, offer.provideCurrencyId),
  ];
  return {
    id: offer.id,
    bank,
    terms: offer.terms,
    termsHash: offer.termsHash,
    remainingLots: offer.remainingLots,
    reservedMinor:
      status === 'ACTIVE'
        ? (BigInt(offer.remainingLots) * BigInt(offer.providePerLotMinor)).toString()
        : '0',
    status,
    executable:
      status === 'ACTIVE' &&
      BigInt(offer.remainingLots) >= BigInt(offer.terms.minimumLots) &&
      bank.available &&
      currencies.every((currency) => currency.status === 'ACTIVE'),
    publishDirectiveId: offer.publishDirectiveId,
    createdAt: offer.createdAt.toISOString(),
    currencies,
  };
}
async function fxReceiptDto(
  transaction: Transaction,
  exchange: typeof fxExchanges.$inferSelect,
): Promise<FxReceipt> {
  const journals = await transaction
    .select({ leg: fxExchangeJournals.leg, journalId: fxExchangeJournals.journalId })
    .from(fxExchangeJournals)
    .where(eq(fxExchangeJournals.exchangeId, exchange.id));
  return {
    id: exchange.id,
    event: exchange.event,
    actorId: exchange.actorId,
    offerId: exchange.offerId,
    tradeId: exchange.tradeId,
    quoteId: exchange.quoteId,
    receiveCurrencyId: exchange.receiveCurrencyId,
    provideCurrencyId: exchange.provideCurrencyId,
    receiveMinor: exchange.receiveMinor,
    provideMinor: exchange.provideMinor,
    firstApprovalId: exchange.firstApprovalId,
    secondApprovalId: exchange.secondApprovalId,
    journals,
    createdAt: exchange.createdAt.toISOString(),
    currencies: [
      await fxCurrency(transaction, exchange.receiveCurrencyId),
      await fxCurrency(transaction, exchange.provideCurrencyId),
    ],
  };
}
async function interbankTradeDto(
  transaction: Transaction,
  trade: typeof fxInterbankTrades.$inferSelect,
): Promise<InterbankTrade> {
  const approvals = await transaction
    .select()
    .from(fxInterbankApprovals)
    .where(eq(fxInterbankApprovals.tradeId, trade.id))
    .orderBy(desc(fxInterbankApprovals.createdAt));
  const [exchange] = await transaction
    .select({ id: fxExchanges.id })
    .from(fxExchanges)
    .where(eq(fxExchanges.tradeId, trade.id));
  return {
    id: trade.id,
    terms: trade.terms,
    termsHash: trade.termsHash,
    status: trade.status,
    createdAt: trade.createdAt.toISOString(),
    approvals: approvals.map((row) => ({
      directiveId: row.directiveId,
      stateId: row.stateId,
      actorId: row.actorId,
      createdAt: row.createdAt.toISOString(),
    })),
    exchangeId: exchange?.id ?? null,
    currencies: [
      await fxCurrency(transaction, trade.terms.first.currencyId),
      await fxCurrency(transaction, trade.terms.second.currencyId),
    ],
    banks: [
      await fxBankIdentity(transaction, trade.terms.first.bankId),
      await fxBankIdentity(transaction, trade.terms.second.bankId),
    ],
  };
}
export { fxOfferDto, fxReceiptDto, interbankTradeDto, PAGE_SIZE };
