import { and, desc, eq, inArray } from 'drizzle-orm';
import type { z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import {
  centralBanks,
  states,
  fxOffers,
  fxExchanges,
  fxQuotes,
  fxOfferEvents,
} from '../../db/schema';
import { DomainError, HTTP } from '../errors';
import type { FxOffer, FxOfferListSchema, FxOfferFillListSchema } from './read-contracts';
import { fxOfferDto, PAGE_SIZE } from './reader';
import { fxBankIdentity } from './display';
import { fxCatalogueFilter, catalogueCurrencies } from './catalogue';
import type { FxOfferSearch } from './route-contracts';

class PublicFxService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async bank(stateId: string): Promise<FxOffer['bank']> {
    return await this.db.transaction(
      async (transaction) => {
        const [bank] = await transaction
          .select({ id: centralBanks.id })
          .from(centralBanks)
          .where(
            and(
              eq(centralBanks.stateId, stateId),
              inArray(centralBanks.status, ['ACTIVE', 'SUSPENDED']),
            ),
          );
        if (!bank) {
          throw new DomainError(
            HTTP.notFound,
            'FX_BANK_NOT_FOUND',
            'Опубликованный Центральный банк не найден',
          );
        }
        return await fxBankIdentity(transaction, bank.id);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  public async list(
    page = 1,
    filters: Partial<FxOfferSearch> = {},
  ): Promise<z.infer<typeof FxOfferListSchema>> {
    return await this.db.transaction(
      async (transaction) => {
        const rows = await transaction
          .select({ offer: fxOffers })
          .from(fxOffers)
          .innerJoin(centralBanks, eq(centralBanks.id, fxOffers.bankId))
          .innerJoin(states, eq(states.id, fxOffers.stateId))
          .where(fxCatalogueFilter(filters))
          .orderBy(desc(fxOffers.createdAt), desc(fxOffers.id))
          .limit(PAGE_SIZE + 1)
          .offset((page - 1) * PAGE_SIZE);
        const items: FxOffer[] = [];
        for (const row of rows.slice(0, PAGE_SIZE)) {
          // oxlint-disable-next-line no-await-in-loop -- Published official identities are read on the same cookie-free snapshot.
          items.push(await fxOfferDto(transaction, row.offer));
        }
        return {
          items,
          page,
          hasMore: rows.length > PAGE_SIZE,
          currencies: await catalogueCurrencies(transaction),
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  public async detail(id: string): Promise<FxOffer> {
    return await this.db.transaction(
      async (transaction) => {
        const [offer] = await transaction.select().from(fxOffers).where(eq(fxOffers.id, id));
        if (!offer) {
          throw new DomainError(
            HTTP.notFound,
            'FX_OFFER_NOT_FOUND',
            'Валютное предложение не найдено',
          );
        }
        return await fxOfferDto(transaction, offer);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  public async fills(id: string, page = 1): Promise<z.infer<typeof FxOfferFillListSchema>> {
    return await this.db.transaction(
      async (transaction) => {
        const [offer] = await transaction
          .select({ id: fxOffers.id })
          .from(fxOffers)
          .where(eq(fxOffers.id, id));
        if (!offer) {
          throw new DomainError(
            HTTP.notFound,
            'FX_OFFER_NOT_FOUND',
            'Валютное предложение не найдено',
          );
        }
        const rows = await transaction
          .select({
            id: fxOfferEvents.id,
            createdAt: fxExchanges.createdAt,
            lots: fxQuotes.lots,
            receiveMinor: fxExchanges.receiveMinor,
            provideMinor: fxExchanges.provideMinor,
          })
          .from(fxExchanges)
          .innerJoin(fxQuotes, eq(fxQuotes.id, fxExchanges.quoteId))
          .innerJoin(fxOfferEvents, eq(fxOfferEvents.exchangeId, fxExchanges.id))
          .where(eq(fxExchanges.offerId, id))
          .orderBy(desc(fxExchanges.createdAt), desc(fxExchanges.id))
          .limit(PAGE_SIZE + 1)
          .offset((page - 1) * PAGE_SIZE);
        return {
          items: rows.slice(0, PAGE_SIZE).map((row) => ({
            id: row.id,
            createdAt: row.createdAt.toISOString(),
            lots: row.lots,
            receiveMinor: row.receiveMinor,
            provideMinor: row.provideMinor,
          })),
          page,
          hasMore: rows.length > PAGE_SIZE,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
export { PublicFxService };
