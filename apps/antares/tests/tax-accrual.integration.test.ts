// oxlint-disable import/max-dependencies -- Real tax settlement, immutable ledger, revisions and constraint guards share the same disposable database.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import {
  taxFractionalBalances,
  taxFractionalMovements,
  ledgerTransactions,
} from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import { TaxationService } from '../src/modules/taxation/service';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority, establishTaxOffice, establishMoney } from './taxation-fixture';

// oxlint-disable-next-line max-lines-per-function -- This suite contains one complete financial history.
describe('fractional obligations on PostgreSQL', () => {
  // oxlint-disable-next-line max-lines-per-function, max-statements -- Verify tiny payments, stale quotes, exactly-once retries and rollback against one persistent obligation.
  it('prevents transfer fragmentation and persists only committed exact obligation movements', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      const { db } = database;
      await migrate(db, { migrationsFolder: './drizzle' });
      const fixture = await monetaryFixture(db, 'Rem');
      const other = await monetaryFixture(db, 'Oth');
      await addEconomicAuthority(db, fixture);
      await establishTaxOffice(db, fixture);
      const currencyId = await establishMoney(db, fixture);
      const actor = { id: fixture.founderId, admin: false };
      await new MonetaryDirectiveService(db).create(fixture.stateId, actor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'ENACT_TAX_LAW',
          lawId: crypto.randomUUID(),
          name: { en: 'Exact transfer tax' },
          description: {},
          document: {},
          effectiveAt: new Date(0).toISOString(),
          rule: {
            event: 'PLAYER_TRANSFER',
            category: 'TRANSFER',
            taxpayer: 'SENDER',
            jurisdictions: ['CITIZENSHIP'],
            rateBps: 500,
            recipient: 'STATE_TREASURY',
            currencyIds: [],
          },
        },
      });
      const money = new MonetaryService(db);
      const tax = new TaxationService(db);
      let collected = 0n;
      for (let index = 0; index < 20; index += 1) {
        const request = {
          idempotencyKey: crypto.randomUUID(),
          currencyId,
          recipientId: index % 2 === 0 ? fixture.citizenId : other.citizenId,
          amountMinor: '1',
          purpose: 'Tiny transfer',
        };
        // oxlint-disable-next-line no-await-in-loop -- Each new quote confirms the exact residual left by the previous committed payment.
        const quote = await money.quote(actor.id, request);
        collected += BigInt(quote.calculation.totalTaxMinor);
        // oxlint-disable-next-line no-await-in-loop -- A sequential history proves repeated subdivision cannot reset taxpayer obligations.
        await money.transfer(actor.id, { ...request, quoteId: quote.id });
      }
      expect(collected).toBe(1n);
      const [balance] = await db.select().from(taxFractionalBalances);
      expect(balance?.remainder).toBe('0');
      expect(await db.select().from(taxFractionalMovements)).toHaveLength(20);
      const request = {
        idempotencyKey: crypto.randomUUID(),
        currencyId,
        recipientId: fixture.citizenId,
        amountMinor: '1',
        purpose: 'Retry safety',
      };
      const second = { ...request, idempotencyKey: crypto.randomUUID() };
      const firstQuote = await money.quote(actor.id, request);
      const secondQuote = await money.quote(actor.id, second);
      const duplicates = await Promise.all([
        money.transfer(actor.id, { ...request, quoteId: firstQuote.id }),
        money.transfer(actor.id, { ...request, quoteId: firstQuote.id }),
      ]);
      expect(duplicates[0]).toBe(duplicates[1]);
      await expect(
        money.transfer(actor.id, { ...second, quoteId: secondQuote.id }),
      ).rejects.toThrow('изменились');
      expect(await db.select().from(taxFractionalMovements)).toHaveLength(21);
      const renewed = await money.quote(actor.id, second);
      await money.transfer(actor.id, { ...second, quoteId: renewed.id });
      const balancesBefore = await db.select().from(taxFractionalBalances);
      const movementsBefore = await db.select().from(taxFractionalMovements);
      const journalsBefore = await db.select().from(ledgerTransactions);
      await db.execute(
        sql`create function reject_fractional_test_payment() returns trigger language plpgsql as $$ begin if NEW.assessment_id is not null then raise exception 'Injected tax journal failure'; end if; return NEW; end; $$`,
      );
      await db.execute(
        sql`create trigger reject_fractional_test_payment before insert on economic_journals for each row execute function reject_fractional_test_payment()`,
      );
      const failing = { ...request, idempotencyKey: crypto.randomUUID(), amountMinor: '20' };
      const failingQuote = await money.quote(actor.id, failing);
      try {
        await expect(
          money.transfer(actor.id, { ...failing, quoteId: failingQuote.id }),
        ).rejects.toThrow();
      } finally {
        await db.execute(sql`drop trigger reject_fractional_test_payment on economic_journals`);
        await db.execute(sql`drop function reject_fractional_test_payment()`);
      }
      expect(await db.select().from(taxFractionalBalances)).toEqual(balancesBefore);
      expect(await db.select().from(taxFractionalMovements)).toEqual(movementsBefore);
      expect(await db.select().from(ledgerTransactions)).toEqual(journalsBefore);
      if (!balance) {
        throw new Error('Residual identity missing');
      }
      await expect(
        db
          .update(taxFractionalBalances)
          .set({ remainder: '0' })
          .where(eq(taxFractionalBalances.key, balance.key)),
      ).rejects.toThrow();
      const [movement] = movementsBefore;
      if (!movement) {
        throw new Error('Exact movement missing');
      }
      await expect(
        db.delete(taxFractionalMovements).where(eq(taxFractionalMovements.id, movement.id)),
      ).rejects.toThrow();
      await expect(
        db.insert(taxFractionalMovements).values({ ...movement, id: crypto.randomUUID() }),
      ).rejects.toThrow();
      const completedId = await money.transfer(actor.id, { ...failing, quoteId: failingQuote.id });
      const saved = await tax.operation(completedId, actor.id);
      expect(saved.calculation.charges[0]?.allocations[0]?.accrual?.remainderBefore).toBe(
        '10000000',
      );
      expect(saved.calculation.charges[0]?.allocations[0]?.accrual?.remainderAfter).toBe(
        '10000000',
      );
      expect(saved.calculation.totalTaxMinor).toBe('1');
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
