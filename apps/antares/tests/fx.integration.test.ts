import { eq, sql } from 'drizzle-orm';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import {
  currencies,
  economicOperations,
  financialAccounts,
  fxExchanges,
  fxExchangeJournals,
  fxOffers,
  ledgerTransactions,
} from '../src/db/schema';
import type { Transaction } from '../src/modules/permissions/transaction';
import type { DirectivePayload } from '../src/modules/monetary/contracts';
import { quoteOffer, fillOffer } from '../src/modules/fx/fills';
import { bankReservedMinor } from '../src/modules/fx/reserves';
import { createFxFixture, fxCommand, fxTransaction } from './fx-fixture';
import type { FxFixture, FxStateFixture } from './fx-fixture';

let environment: FxFixture | null = null;
function context(): FxFixture {
  if (environment === null) {
    throw new Error('FX fixture missing');
  }
  return environment;
}
async function directive(state: FxStateFixture, payload: DirectivePayload): Promise<string> {
  return await fxCommand(context(), state, payload);
}
async function transactionContext<Result>(
  work: (transaction: Transaction) => Promise<Result>,
): Promise<Result> {
  return await fxTransaction(context(), work);
}
beforeAll(async () => {
  environment = await createFxFixture();
});
afterAll(async () => {
  await environment?.db.pool.end();
  await environment?.container.stop();
});
// oxlint-disable-next-line max-lines-per-function -- Two real scenarios retain their exact two-currency before/after assertions and rollback evidence.
describe('real FX reservations and atomic exchange', () => {
  it('requires both real Governance decisions and exchanges two currencies without increasing either supply', async () => {
    const { db, first, second, firstCurrency, secondCurrency, firstBank, secondBank } = context();
    const terms = {
      first: {
        stateId: first.stateId,
        bankId: firstBank,
        currencyId: firstCurrency,
        amountMinor: '2000',
      },
      second: {
        stateId: second.stateId,
        bankId: secondBank,
        currencyId: secondCurrency,
        amountMinor: '1000',
      },
      expiresAt: '2099-01-01T00:00:00.000Z',
    };
    const payload = {
      kind: 'APPROVE_INTERBANK_EXCHANGE' as const,
      tradeId: crypto.randomUUID(),
      terms,
    };
    await directive(first, payload);
    expect(await db.db.select().from(fxExchanges)).toHaveLength(0);
    await expect(
      directive(second, {
        ...payload,
        terms: { ...terms, first: { ...terms.first, amountMinor: '2001' } },
      }),
    ).rejects.toMatchObject({ code: 'FX_TRADE_STALE' });
    await directive(second, payload);
    expect(await db.db.select().from(fxExchanges)).toHaveLength(1);
    expect(await db.db.select().from(fxExchangeJournals)).toHaveLength(2);
    expect(await db.db.select().from(economicOperations)).toHaveLength(0);
    expect((await db.db.select().from(currencies)).map((currency) => currency.supplyMinor)).toEqual(
      ['1000000', '1000000'],
    );
  });
  it('reserves actual foreign holdings, fills exact quoted lots and rolls both currencies back on a late failure', async () => {
    const { db, first, firstBank, firstCurrency, secondCurrency } = context();
    const offerId = crypto.randomUUID();
    await directive(first, {
      kind: 'PUBLISH_FX_OFFER',
      offerId,
      terms: {
        receiveCurrencyId: firstCurrency,
        provideCurrencyId: secondCurrency,
        receivePerLotMinor: '2',
        providePerLotMinor: '1',
        totalLots: '500',
        minimumLots: '1',
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
    });
    expect(
      await transactionContext(
        async (transaction) => await bankReservedMinor(transaction, firstBank, secondCurrency),
      ),
    ).toBe('500');
    const quote = await transactionContext(
      async (transaction) =>
        await quoteOffer(transaction, { offerId, actorId: first.founderId, lots: '100' }),
    );
    const before = await db.db.select().from(financialAccounts).orderBy(financialAccounts.id);
    const journals = await db.db.select().from(ledgerTransactions);
    await db.db.execute(
      sql`create function reject_fx_second_leg() returns trigger language plpgsql as $$ begin if NEW.leg = 'PROVIDE' then raise exception 'Injected second-leg failure'; end if; return NEW; end; $$`,
    );
    await db.db.execute(
      sql`create trigger reject_fx_second_leg before insert on fx_exchange_journals for each row execute function reject_fx_second_leg()`,
    );
    const input = { quoteId: quote.id, idempotencyKey: crypto.randomUUID() };
    try {
      await expect(
        transactionContext(
          async (transaction) =>
            await fillOffer(transaction, { offerId, actorId: first.founderId, command: input }),
        ),
      ).rejects.toThrow();
    } finally {
      await db.db.execute(sql`drop trigger reject_fx_second_leg on fx_exchange_journals`);
      await db.db.execute(sql`drop function reject_fx_second_leg()`);
    }
    expect(await db.db.select().from(financialAccounts).orderBy(financialAccounts.id)).toEqual(
      before,
    );
    expect(await db.db.select().from(ledgerTransactions)).toEqual(journals);
    expect(
      (await db.db.select().from(fxOffers).where(eq(fxOffers.id, offerId)))[0]?.remainingLots,
    ).toBe('500');
    const id = await transactionContext(
      async (transaction) =>
        await fillOffer(transaction, { offerId, actorId: first.founderId, command: input }),
    );
    expect(
      await transactionContext(
        async (transaction) =>
          await fillOffer(transaction, { offerId, actorId: first.founderId, command: input }),
      ),
    ).toBe(id);
    expect(
      await transactionContext(
        async (transaction) => await bankReservedMinor(transaction, firstBank, secondCurrency),
      ),
    ).toBe('400');
    expect(
      (await db.db.select().from(fxOffers).where(eq(fxOffers.id, offerId)))[0]?.remainingLots,
    ).toBe('400');
  });
});
