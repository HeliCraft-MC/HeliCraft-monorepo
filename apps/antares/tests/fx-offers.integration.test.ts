import { setTimeout as delay } from 'node:timers/promises';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  financialAccounts,
  fxExchanges,
  fxOffers,
  fxOfferEvents,
  stateOfficeHolders,
} from '../src/db/schema';
import { FxService } from '../src/modules/fx/service';
import { PublicFxService } from '../src/modules/fx/public';
import { bankReservedMinor } from '../src/modules/fx/reserves';
import { MonetaryService } from '../src/modules/monetary/service';
import type { FxOfferTerms } from '../src/modules/fx/contracts';
import {
  createFxFixture,
  fxCommand,
  fxTransaction,
  fundFxReserve,
  interbankTerms,
} from './fx-fixture';
import type { FxFixture } from './fx-fixture';

let environment: FxFixture | null = null;
function context(): FxFixture {
  if (environment === null) {
    throw new Error('FX fixture missing');
  }
  return environment;
}
function terms(input: Partial<FxOfferTerms> = {}): FxOfferTerms {
  const fixture = context();
  return {
    receiveCurrencyId: fixture.firstCurrency,
    provideCurrencyId: fixture.secondCurrency,
    receivePerLotMinor: '2',
    providePerLotMinor: '1',
    totalLots: '900',
    minimumLots: '1',
    expiresAt: '2099-01-01T00:00:00.000Z',
    ...input,
  };
}
async function publish(input: Partial<FxOfferTerms> = {}): Promise<string> {
  const fixture = context();
  const offerId = crypto.randomUUID();
  await fxCommand(fixture, fixture.first, {
    kind: 'PUBLISH_FX_OFFER',
    offerId,
    terms: terms(input),
  });
  return offerId;
}
beforeEach(async () => {
  environment = await createFxFixture();
  await fundFxReserve(environment);
});
afterEach(async () => {
  await environment?.db.pool.end();
  await environment?.container.stop();
  environment = null;
});
// oxlint-disable-next-line max-lines-per-function -- Independent scenarios verify the complete reserved-funds lifecycle, concurrent fills and bilateral authority continuity.
describe('finite FX offers and current bilateral authority', () => {
  it('protects reservations from official spending, supports foreign holdings and never permits foreign issuance or burning', async () => {
    const fixture = context();
    const { first, firstBank, secondCurrency, db } = fixture;
    const offerId = await publish();
    const transfer = {
      kind: 'BANK_TRANSFER' as const,
      currencyId: secondCurrency,
      amountMinor: '101',
      purpose: 'Actual foreign funds',
      recipient: { type: 'PLAYER' as const, userId: first.founderId },
    };
    await expect(fxCommand(fixture, first, transfer)).rejects.toMatchObject({
      code: 'INSUFFICIENT_AVAILABLE_FUNDS',
    });
    await expect(
      fxCommand(fixture, first, {
        kind: 'ISSUE',
        currencyId: secondCurrency,
        amountMinor: '1',
        purpose: '',
      }),
    ).rejects.toMatchObject({ code: 'CURRENCY_UNAVAILABLE' });
    await expect(
      fxCommand(fixture, first, {
        kind: 'BURN',
        currencyId: secondCurrency,
        amountMinor: '1',
        purpose: '',
      }),
    ).rejects.toMatchObject({ code: 'CURRENCY_UNAVAILABLE' });
    await fxCommand(fixture, first, { ...transfer, amountMinor: '50' });
    await fxCommand(fixture, first, {
      ...transfer,
      amountMinor: '50',
      recipient: { type: 'TREASURY' },
    });
    const wallet = await new MonetaryService(db.db).state(first.stateId, {
      id: first.founderId,
      admin: false,
    });
    expect(
      wallet.accounts.find(
        (account) => account.kind === 'CENTRAL_BANK' && account.currencyId === secondCurrency,
      ),
    ).toMatchObject({
      ownerId: firstBank,
      balanceMinor: '900',
      reservedMinor: '900',
      availableMinor: '0',
    });
    expect(
      wallet.accounts.find(
        (account) => account.kind === 'TREASURY' && account.currencyId === secondCurrency,
      ),
    ).toMatchObject({ ownerId: first.stateId, balanceMinor: '50' });
    expect(new Set(wallet.currencies.map((currency) => currency.code))).toEqual(
      new Set(['FXA', 'FXB']),
    );
    const offer = await new PublicFxService(db.db).detail(offerId);
    await fxCommand(fixture, first, {
      kind: 'CANCEL_FX_OFFER',
      offerId,
      termsHash: offer.termsHash,
    });
    expect(
      await fxTransaction(
        fixture,
        async (transaction) => await bankReservedMinor(transaction, firstBank, secondCurrency),
      ),
    ).toBe('0');
    await fxCommand(fixture, first, { ...transfer, amountMinor: '900' });
    await expect(
      db.db.update(fxOffers).set({ termsHash: 'forged' }).where(eq(fxOffers.id, offerId)),
    ).rejects.toThrow();
  });
  it('serializes competing partial fills, finishes the remaining lots and preserves exact idempotent receipts', async () => {
    const fixture = context();
    const { first, db } = fixture;
    const offerId = await publish({ totalLots: '1000' });
    const service = new FxService(db.db);
    const one = await service.quote(offerId, first.founderId, { lots: '600' });
    const two = await service.quote(offerId, first.founderId, { lots: '600' });
    const results = await Promise.allSettled([
      service.fill(offerId, first.founderId, {
        quoteId: one.id,
        idempotencyKey: crypto.randomUUID(),
      }),
      service.fill(offerId, first.founderId, {
        quoteId: two.id,
        idempotencyKey: crypto.randomUUID(),
      }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect((await new PublicFxService(db.db).detail(offerId)).remainingLots).toBe('400');
    const final = await service.quote(offerId, first.founderId, { lots: '400' });
    const command = { quoteId: final.id, idempotencyKey: crypto.randomUUID() };
    const receipt = await service.fill(offerId, first.founderId, command);
    expect(receipt.journals).toHaveLength(2);
    expect(receipt).toMatchObject({
      event: 'FX_EXCHANGE',
      receiveMinor: '800',
      provideMinor: '400',
    });
    expect(await service.fill(offerId, first.founderId, command)).toEqual(receipt);
    expect((await new PublicFxService(db.db).detail(offerId)).status).toBe('FILLED');
    expect(
      (await db.db.select().from(financialAccounts)).every(
        (account) => account.kind === 'ISSUANCE' || BigInt(account.balanceMinor) >= 0n,
      ),
    ).toBe(true);
  });
  it('keeps a below-minimum tail reserved but excludes it from executable public offers until cancellation', async () => {
    const fixture = context();
    const offerId = await publish({ totalLots: '20', minimumLots: '10' });
    const service = new FxService(fixture.db.db);
    const quote = await service.quote(offerId, fixture.first.founderId, { lots: '15' });
    await service.fill(offerId, fixture.first.founderId, {
      quoteId: quote.id,
      idempotencyKey: crypto.randomUUID(),
    });
    const published = new PublicFxService(fixture.db.db);
    const tail = await published.detail(offerId);
    expect(tail).toMatchObject({
      status: 'ACTIVE',
      executable: false,
      remainingLots: '5',
      reservedMinor: '5',
    });
    const catalogue = await published.list();
    expect(catalogue.items.map((offer) => offer.id)).not.toContain(offerId);
    await expect(
      service.quote(offerId, fixture.first.founderId, { lots: '5' }),
    ).rejects.toMatchObject({ code: 'FX_LOTS_UNAVAILABLE' });
    await fxCommand(fixture, fixture.first, {
      kind: 'CANCEL_FX_OFFER',
      offerId,
      termsHash: tail.termsHash,
    });
    expect(await published.detail(offerId)).toMatchObject({
      status: 'CANCELLED',
      reservedMinor: '0',
    });
  });
  it('releases expired reservations at their immutable deadline and cannot execute an expired quote', async () => {
    const fixture = context();
    const { first, firstBank, secondCurrency, db } = fixture;
    const offerId = await publish({ expiresAt: new Date(Date.now() + 1500).toISOString() });
    const service = new FxService(db.db);
    const quote = await service.quote(offerId, first.founderId, { lots: '1' });
    expect(
      await fxTransaction(
        fixture,
        async (transaction) => await bankReservedMinor(transaction, firstBank, secondCurrency),
      ),
    ).toBe('900');
    await delay(1700);
    expect(
      await fxTransaction(
        fixture,
        async (transaction) => await bankReservedMinor(transaction, firstBank, secondCurrency),
      ),
    ).toBe('0');
    await expect(
      service.fill(offerId, first.founderId, {
        quoteId: quote.id,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'FX_QUOTE_STALE' });
    await service.expire(offerId, first.founderId);
    expect((await new PublicFxService(db.db).detail(offerId)).status).toBe('EXPIRED');
    expect(
      (await db.db.select().from(fxOfferEvents).where(eq(fxOfferEvents.offerId, offerId))).map(
        (event) => event.kind,
      ),
    ).toEqual(['PUBLISH', 'EXPIRE']);
  });
  it('does not revive the other state signature after the approving office holder is removed and reappointed', async () => {
    const fixture = context();
    const { first, second, db } = fixture;
    const payload = interbankTerms(fixture);
    await fxCommand(fixture, first, payload);
    await db.db.transaction(async (transaction) => {
      await transaction
        .update(stateOfficeHolders)
        .set({ until: sql`clock_timestamp()` })
        .where(
          and(eq(stateOfficeHolders.officeId, first.officeId), isNull(stateOfficeHolders.until)),
        );
      await transaction.insert(stateOfficeHolders).values({
        officeId: first.officeId,
        userId: first.founderId,
        since: sql`clock_timestamp()`,
      });
    });
    await fxCommand(fixture, second, payload);
    expect(await db.db.select().from(fxExchanges)).toHaveLength(1);
    await fxCommand(fixture, first, payload);
    expect(await db.db.select().from(fxExchanges)).toHaveLength(2);
  });
});
