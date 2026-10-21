// oxlint-disable import/max-dependencies -- Authenticated FX commands, current state readership, immutable receipts and finite offer projections share this domain boundary.
import { and, desc, eq, isNotNull, or } from 'drizzle-orm';
import type { z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { fxExchanges, fxOffers, fxInterbankTrades } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { monetaryActor } from '../monetary/store';
import type { MonetaryActor } from '../monetary/contracts';
import { assignmentState } from '../states/office-assignment-context';
import { FxFillInputSchema, FxQuoteInputSchema } from './contracts';
import type { FxFillInput } from './contracts';
import type { FxQuote, FxReceipt, FxReceiptListSchema, StateFx } from './read-contracts';
import { quoteOffer, fillOffer } from './fills';
import { closeOffer } from './offers';
import { fxOfferDto, fxReceiptDto, interbankTradeDto, PAGE_SIZE } from './reader';
import { stateFxDecisions } from './state-decisions';

async function stateReader(
  transaction: Transaction,
  stateId: string,
  actor: MonetaryActor,
): Promise<boolean> {
  try {
    await assignmentState(transaction, stateId, actor);
    return true;
  } catch (error) {
    if (
      error instanceof DomainError &&
      (error.status === HTTP.forbidden || error.status === HTTP.notFound)
    ) {
      return false;
    }
    throw error;
  }
}
async function assertReceiptReader(
  transaction: Transaction,
  exchange: typeof fxExchanges.$inferSelect,
  actor: MonetaryActor,
): Promise<void> {
  if (actor.admin || (exchange.offerId !== null && exchange.actorId === actor.id)) {
    return;
  }
  if (exchange.tradeId !== null) {
    const [trade] = await transaction
      .select()
      .from(fxInterbankTrades)
      .where(eq(fxInterbankTrades.id, exchange.tradeId));
    if (
      trade &&
      ((await stateReader(transaction, trade.firstStateId, actor)) ||
        (await stateReader(transaction, trade.secondStateId, actor)))
    ) {
      return;
    }
  }
  throw new DomainError(HTTP.notFound, 'FX_EXCHANGE_NOT_FOUND', 'Операция обмена не найдена');
}
class FxService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async quote(offerId: string, actorId: string, raw: { lots: string }): Promise<FxQuote> {
    const input = FxQuoteInputSchema.parse(raw);
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, { id: actorId, admin: false });
      const quote = await quoteOffer(transaction, { offerId, actorId, lots: input.lots });
      return {
        id: quote.id,
        offerId: quote.offerId,
        termsHash: quote.termsHash,
        lots: quote.lots,
        receiveMinor: quote.receiveMinor,
        provideMinor: quote.provideMinor,
        expiresAt: quote.expiresAt.toISOString(),
        createdAt: quote.createdAt.toISOString(),
      };
    });
  }
  public async fill(offerId: string, actorId: string, raw: FxFillInput): Promise<FxReceipt> {
    const input = FxFillInputSchema.parse(raw);
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, { id: actorId, admin: false });
      const id = await fillOffer(transaction, { offerId, actorId, command: input });
      const [exchange] = await transaction.select().from(fxExchanges).where(eq(fxExchanges.id, id));
      if (!exchange) {
        throw new Error('Committed FX receipt missing');
      }
      return await fxReceiptDto(transaction, exchange);
    });
  }
  public async expire(offerId: string, actorId: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, { id: actorId, admin: false });
      await closeOffer(transaction, { offerId, actorId, kind: 'EXPIRE' });
    });
  }
  public async receipt(id: string, actor: MonetaryActor): Promise<FxReceipt> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      const [exchange] = await transaction.select().from(fxExchanges).where(eq(fxExchanges.id, id));
      if (!exchange) {
        throw new DomainError(HTTP.notFound, 'FX_EXCHANGE_NOT_FOUND', 'Операция обмена не найдена');
      }
      await assertReceiptReader(transaction, exchange, actor);
      return await fxReceiptDto(transaction, exchange);
    });
  }
  public async history(actorId: string, page = 1): Promise<z.infer<typeof FxReceiptListSchema>> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, { id: actorId, admin: false });
      const rows = await transaction
        .select()
        .from(fxExchanges)
        .where(and(eq(fxExchanges.actorId, actorId), isNotNull(fxExchanges.offerId)))
        .orderBy(desc(fxExchanges.createdAt), desc(fxExchanges.id))
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);
      const items: FxReceipt[] = [];
      for (const row of rows.slice(0, PAGE_SIZE)) {
        // oxlint-disable-next-line no-await-in-loop -- Exact immutable journals and currency labels are read on one protected transaction.
        items.push(await fxReceiptDto(transaction, row));
      }
      return { items, page, hasMore: rows.length > PAGE_SIZE };
    });
  }
  public async state(stateId: string, actor: MonetaryActor, page = 1): Promise<StateFx> {
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, actor);
      await assignmentState(transaction, stateId, actor);
      const offers = await transaction
        .select()
        .from(fxOffers)
        .where(eq(fxOffers.stateId, stateId))
        .orderBy(desc(fxOffers.createdAt), desc(fxOffers.id))
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);
      const trades = await transaction
        .select()
        .from(fxInterbankTrades)
        .where(
          or(
            eq(fxInterbankTrades.firstStateId, stateId),
            eq(fxInterbankTrades.secondStateId, stateId),
          ),
        )
        .orderBy(desc(fxInterbankTrades.createdAt), desc(fxInterbankTrades.id))
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);
      const offerItems: StateFx['offers'] = [];
      const decisions = await stateFxDecisions(transaction, { stateId, actor, page });
      const tradeItems: StateFx['trades'] = [];
      for (const offer of offers.slice(0, PAGE_SIZE)) {
        // oxlint-disable-next-line no-await-in-loop -- Bounded state-owned offers use official identities and finite public terms.
        offerItems.push(await fxOfferDto(transaction, offer));
      }
      for (const trade of trades.slice(0, PAGE_SIZE)) {
        // oxlint-disable-next-line no-await-in-loop -- Pending bilateral terms remain in the authorized parties' protected workspace.
        tradeItems.push(await interbankTradeDto(transaction, trade));
      }
      return {
        offers: offerItems,
        trades: tradeItems,
        decisions: decisions.items,
        page,
        hasMore: offers.length > PAGE_SIZE || trades.length > PAGE_SIZE || decisions.hasMore,
      };
    });
  }
}
export { FxService };
