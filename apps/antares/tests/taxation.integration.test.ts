// oxlint-disable import/max-dependencies -- Real PostgreSQL scenario verifies Governance, treaty, tax and ledger boundaries together.
// oxlint-disable max-lines-per-function, max-statements -- Complete atomic lifecycle assertions share one disposable financial history.
import { assertLawHistory } from './taxation-history-scenario';
import { assertTaxReliability } from './taxation-reliability-scenario';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { and, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import {
  stateMemberships,
  taxLawRevisions,
  economicOperations,
  taxAssessments,
  taxAssessmentClaims,
  ledgerTransactions,
  financialAccounts,
  treaties,
} from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import { TaxationService } from '../src/modules/taxation/service';
import { DiplomacyService } from '../src/modules/diplomacy/service';
import type { DirectivePayload } from '../src/modules/monetary/contracts';
import type { TreatyContent } from '../src/modules/diplomacy/contracts';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority, establishTaxOffice, establishMoney } from './taxation-fixture';

function law(lawId: string, rateBps: number): DirectivePayload {
  return {
    kind: 'ENACT_TAX_LAW',
    lawId,
    name: { en: `Transfer tax ${rateBps}`, ru: `Налог ${rateBps}` },
    description: {},
    document: { en: '# Real tax law\n<script>private</script>' },
    effectiveAt: new Date(0).toISOString(),
    rule: {
      event: 'PLAYER_TRANSFER',
      category: 'TRANSFER',
      taxpayer: 'SENDER',
      jurisdictions: ['CITIZENSHIP', 'TERRITORIAL'],
      rateBps,
      recipient: 'STATE_TREASURY',
      currencyIds: [],
    },
  };
}
describe('taxation and bilateral diplomacy on PostgreSQL', () => {
  it('enforces independent national claims, exact bilateral replacement, quotes, rollback and immutable financial history', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      await migrate(database.db, { migrationsFolder: './drizzle' });
      const { db } = database;
      const first = await monetaryFixture(db, 'A');
      const second = await monetaryFixture(db, 'B');
      const actor = { id: first.founderId, admin: false };
      const partner = { id: second.founderId, admin: false };
      const directives = new MonetaryDirectiveService(db);
      const money = new MonetaryService(db);
      const tax = new TaxationService(db);
      const diplomacy = new DiplomacyService(db);
      const noPermission: DirectivePayload = {
        kind: 'ESTABLISH_TAX_OFFICE',
        name: { en: 'Tax authority' },
        description: {},
      };
      await expect(
        directives.create(first.stateId, actor, {
          idempotencyKey: crypto.randomUUID(),
          payload: noPermission,
        }),
      ).rejects.toThrow('полномочие');
      await addEconomicAuthority(db, first);
      await addEconomicAuthority(db, second);
      await establishTaxOffice(db, first);
      await establishTaxOffice(db, second);
      const currencyId = await establishMoney(db, first);
      await db
        .insert(stateMemberships)
        .values({ stateId: second.stateId, userId: first.founderId });
      const lawA = crypto.randomUUID();
      const lawB = crypto.randomUUID();
      const command = async (payload: DirectivePayload, other = false): Promise<string> =>
        await directives.create(other ? second.stateId : first.stateId, other ? partner : actor, {
          idempotencyKey: crypto.randomUUID(),
          payload,
        });
      await command(law(lawA, 500));
      await command(law(lawB, 300), true);
      const transfer = {
        idempotencyKey: crypto.randomUUID(),
        currencyId,
        recipientId: first.citizenId,
        amountMinor: '10000',
        purpose: 'Private taxable transfer',
      };
      const quote = await money.quote(actor.id, transfer);
      expect(quote.calculation.totalDebitMinor).toBe('10800');
      expect(quote.calculation.charges).toHaveLength(2);
      expect(quote.calculation.charges[0]?.claims[0]?.evidence).toHaveLength(2);
      await expect(money.transfer(actor.id, transfer)).rejects.toThrow('расчёт');
      const confirmed = { ...transfer, quoteId: quote.id };
      const concurrent = await Promise.all([
        money.transfer(actor.id, confirmed),
        money.transfer(actor.id, confirmed),
      ]);
      expect(concurrent[0]).toBe(concurrent[1]);
      const [operationId] = concurrent;
      if (!operationId) {
        throw new Error('Missing operation');
      }
      const history = await tax.operation(operationId, actor.id);
      expect(history.journals).toHaveLength(3);
      expect((await money.wallet(first.citizenId)).accounts[0]?.balanceMinor).toBe('10000');
      expect((await tax.state(second.stateId, partner)).totals[0]?.amountMinor).toBe('300');
      expect((await tax.state(second.stateId, partner)).accounts[0]?.currencyId).toBe(currencyId);
      await expect(tax.operation(operationId, first.citizenId)).rejects.toThrow('не найдена');
      await expect(
        db
          .update(economicOperations)
          .set({ commandHash: 'changed' })
          .where(eq(economicOperations.id, operationId)),
      ).rejects.toThrow();
      await expect(
        db.delete(taxAssessments).where(eq(taxAssessments.operationId, operationId)),
      ).rejects.toThrow();
      expect(
        await db
          .select()
          .from(taxAssessmentClaims)
          .where(eq(taxAssessmentClaims.operationId, operationId)),
      ).toHaveLength(2);
      const content: TreatyContent = {
        name: { en: 'Shared transfer treaty', ru: 'Соглашение о распределении налогов' },
        description: {},
        document: { en: '# Shared agreement' },
        type: 'TAX_TREATY',
        event: 'PLAYER_TRANSFER',
        category: 'TRANSFER',
        taxpayerScope: 'OVERLAPPING_NATIONAL_CLAIMS',
        terms: { mode: 'SHARED', rateBps: 600, firstShareBps: 5000 },
        effectiveAt: new Date(0).toISOString(),
        expiresAt: null,
        termination: 'BILATERAL',
      };
      const treatyId = await diplomacy.create(first.stateId, actor, {
        partnerStateId: second.stateId,
        content,
      });
      const workspace = await diplomacy.state(first.stateId, actor);
      const [draft] = workspace.items;
      const revision = draft?.revisions[0];
      if (!revision) {
        throw new Error('Treaty revision missing');
      }
      await diplomacy.submit(first.stateId, treatyId, actor, revision.id);
      const ratify: DirectivePayload = {
        kind: 'RATIFY_TREATY',
        treatyId,
        revisionId: revision.id,
        contentHash: revision.contentHash,
      };
      await command(ratify);
      expect(
        (await money.quote(actor.id, { ...transfer, idempotencyKey: crypto.randomUUID() }))
          .calculation.totalTaxMinor,
      ).toBe('800');
      await command(ratify, true);
      const sharedInput = { ...transfer, idempotencyKey: crypto.randomUUID(), amountMinor: '101' };
      const shared = await money.quote(actor.id, sharedInput);
      expect(shared.calculation.totalTaxMinor).toBe('6');
      expect(shared.calculation.charges[0]?.allocations.map((item) => item.amountMinor)).toEqual([
        '3',
        '3',
      ]);
      await money.transfer(actor.id, { ...sharedInput, quoteId: shared.id });
      expect((await tax.state(second.stateId, partner)).totals[0]?.amountMinor).toBe('303');
      expect((await tax.operation(operationId, actor.id)).calculation.totalTaxMinor).toBe('800');
      const staleInput = { ...transfer, idempotencyKey: crypto.randomUUID() };
      const stale = await money.quote(actor.id, staleInput);
      const [current] = await db
        .select()
        .from(taxLawRevisions)
        .where(eq(taxLawRevisions.lawId, lawA));
      if (!current) {
        throw new Error('Law missing');
      }
      await expect(
        db.update(taxLawRevisions).set({ number: 99 }).where(eq(taxLawRevisions.id, current.id)),
      ).rejects.toThrow();
      await command({
        kind: 'REPEAL_TAX_LAW',
        lawId: lawA,
        baseRevisionId: current.id,
        effectiveAt: new Date().toISOString(),
      });
      await expect(money.transfer(actor.id, { ...staleInput, quoteId: stale.id })).rejects.toThrow(
        'изменились',
      );
      expect((await tax.operation(operationId, actor.id)).calculation.totalTaxMinor).toBe('800');
      const overdrawn = { ...transfer, idempotencyKey: crypto.randomUUID(), amountMinor: '999999' };
      const overdrawnQuote = await money.quote(actor.id, overdrawn);
      const before = await db
        .select({ count: sql<string>`count(*)::text` })
        .from(ledgerTransactions);
      await expect(
        money.transfer(actor.id, { ...overdrawn, quoteId: overdrawnQuote.id }),
      ).rejects.toThrow('Недостаточно');
      expect(
        await db.select({ count: sql<string>`count(*)::text` }).from(ledgerTransactions),
      ).toEqual(before);
      const [supply] = await db
        .select({ amount: sql<string>`sum(${financialAccounts.balanceMinor})::text` })
        .from(financialAccounts)
        .where(
          and(
            eq(financialAccounts.currencyId, currencyId),
            sql`${financialAccounts.kind} <> 'ISSUANCE'`,
          ),
        );
      expect(supply?.amount).toBe('1000000');
      expect((await diplomacy.publicTreaty(treatyId, 'en')).revisions).toHaveLength(1);
      expect(JSON.stringify(await tax.publicState(first.stateId, 'en'))).not.toContain(
        'Private taxable transfer',
      );
      await assertTaxReliability(db, { first, second, currencyId });
      await assertLawHistory(db, first);
      await expect(db.delete(treaties).where(eq(treaties.id, treatyId))).rejects.toThrow();
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
