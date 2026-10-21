import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { fxQuotes, fxOfferEvents } from '../src/db/schema';
import { IdentityService } from '../src/modules/identity/service';
import {
  FxOfferSchema,
  FxQuoteSchema,
  FxReceiptSchema,
  FxOfferListSchema,
} from '../src/modules/fx/read-contracts';
import { createFxFixture, fundFxReserve, fxCommand } from './fx-fixture';

const ORIGIN = 'https://fx.helicraft.test';
function request(method: string, token: string, body?: unknown): RequestInit {
  return {
    method,
    headers: {
      Origin: ORIGIN,
      Cookie: `helicraft_session=${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
// oxlint-disable-next-line max-lines-per-function -- One actual HTTP journey is grouped with its shared security assertions.
describe('FX HTTP privacy and immutable confirmation', () => {
  // oxlint-disable-next-line max-lines-per-function, max-statements -- One actual session journey checks anonymous publication, rejected actor injection, atomic execution, replay and historical access.
  it('derives both financial accounts from the authenticated actor and approved offer, never from request account IDs', async () => {
    const fixture = await createFxFixture();
    try {
      const { db, first, firstCurrency, secondCurrency } = fixture;
      await fundFxReserve(fixture);
      const offerId = crypto.randomUUID();
      await fxCommand(fixture, first, {
        kind: 'PUBLISH_FX_OFFER',
        offerId,
        terms: {
          receiveCurrencyId: firstCurrency,
          provideCurrencyId: secondCurrency,
          receivePerLotMinor: '2',
          providePerLotMinor: '1',
          totalLots: '1000',
          minimumLots: '1',
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
      });
      const identity = new IdentityService(db.db);
      const token = await identity.login('MoneyFounderFxA', 'A sufficiently long password');
      const outsiderToken = await identity.register('FxVisitor', 'A sufficiently long password');
      const app = createApp({
        db: db.db,
        siteOrigin: ORIGIN,
        checkReady: async () => {
          await Promise.resolve();
        },
      });
      const offerPath = `/api/v1/public/fx/offers/${offerId}`;
      const publicResponse = await app.request(offerPath, {
        headers: { Cookie: 'helicraft_session=irrelevant-invalid-cookie' },
      });
      expect(publicResponse.status).toBe(200);
      const offer = FxOfferSchema.parse(await publicResponse.json());
      expect(offer).toMatchObject({
        executable: true,
        remainingLots: '1000',
        reservedMinor: '1000',
      });
      expect(JSON.stringify(offer)).not.toMatch(
        /"(?:balanceMinor|accounts|actorId|quoteId|idempotencyKey)":/u,
      );
      const catalogueResponse = await app.request(
        '/api/v1/public/fx/offers?search=FXA&receiveCode=fxa&provideCode=FXB',
      );
      expect(catalogueResponse.status).toBe(200);
      const catalogue = FxOfferListSchema.parse(await catalogueResponse.json());
      expect(catalogue.items.map((item) => item.id)).toEqual([offerId]);
      expect(catalogue.currencies?.map((item) => item.code)).toEqual(['FXA', 'FXB']);
      const reversed = await app.request(
        '/api/v1/public/fx/offers?receiveCode=FXB&provideCode=FXA',
      );
      expect(FxOfferListSchema.parse(await reversed.json()).items).toEqual([]);
      const missingName = await app.request('/api/v1/public/fx/offers?search=absent-bank-name');
      expect(FxOfferListSchema.parse(await missingName.json()).items).toEqual([]);
      const stateName = await app.request('/api/v1/public/fx/offers?search=Денежное');
      expect(FxOfferListSchema.parse(await stateName.json()).items.map((item) => item.id)).toEqual([
        offerId,
      ]);
      const path = `/api/v1/account/fx/offers/${offerId}`;
      expect((await app.request(`${path}/quotes`, request('POST', '', { lots: '1' }))).status).toBe(
        401,
      );
      expect(
        (
          await app.request(`${path}/quotes`, {
            ...request('POST', token, { lots: '1' }),
            headers: {
              Origin: 'https://other.test',
              Cookie: `helicraft_session=${token}`,
              'Content-Type': 'application/json',
            },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await app.request(
            `${path}/quotes`,
            request('POST', token, { lots: '1', actorId: first.citizenId }),
          )
        ).status,
      ).toBe(400);
      const quoteResponse = await app.request(
        `${path}/quotes`,
        request('POST', token, { lots: '10' }),
      );
      expect(quoteResponse.status).toBe(200);
      const quote = FxQuoteSchema.parse(await quoteResponse.json());
      const command = { quoteId: quote.id, idempotencyKey: crypto.randomUUID() };
      expect(
        (await app.request(`${path}/fills`, request('POST', outsiderToken, command))).status,
      ).toBe(409);
      expect(
        (
          await app.request(
            `${path}/fills`,
            request('POST', token, { ...command, sourceAccountId: crypto.randomUUID() }),
          )
        ).status,
      ).toBe(400);
      const filled = await app.request(`${path}/fills`, request('POST', token, command));
      expect(filled.status).toBe(200);
      const receipt = FxReceiptSchema.parse(await filled.json());
      expect(receipt).toMatchObject({
        actorId: first.founderId,
        event: 'FX_EXCHANGE',
        receiveMinor: '20',
        provideMinor: '10',
      });
      expect(receipt.journals).toHaveLength(2);
      const replay = await app.request(`${path}/fills`, request('POST', token, command));
      expect(FxReceiptSchema.parse(await replay.json())).toEqual(receipt);
      expect(
        (
          await app.request(
            `/api/v1/account/fx/exchanges/${receipt.id}`,
            request('GET', outsiderToken),
          )
        ).status,
      ).toBe(404);
      expect(
        (await app.request(`/api/v1/account/fx/exchanges/${receipt.id}`, request('GET', token)))
          .status,
      ).toBe(200);
      const publicFills = await app.request(`${offerPath}/fills`);
      expect(await publicFills.text()).not.toMatch(
        /(?:actorId|quoteId|idempotencyKey|FxVisitor|MoneyFounder)/u,
      );
      await expect(
        db.db.update(fxQuotes).set({ receiveMinor: '1' }).where(eq(fxQuotes.id, quote.id)),
      ).rejects.toThrow();
      await expect(
        db.db.delete(fxOfferEvents).where(eq(fxOfferEvents.offerId, offerId)),
      ).rejects.toThrow();
    } finally {
      await fixture.db.pool.end();
      await fixture.container.stop();
    }
  });
});
