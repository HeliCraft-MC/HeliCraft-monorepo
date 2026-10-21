// oxlint-disable import/max-dependencies -- The scenario exercises real approval, tax institutions, wallets and PostgreSQL integrity together.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { and, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import {
  economicOperations,
  taxLawRevisions,
  taxAssessments,
  financialAccounts,
  ledgerTransactions,
} from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import { BankModerationService } from '../src/modules/monetary/moderation';
import { TaxOfficeModerationService } from '../src/modules/taxation/moderation';
import { TaxationService } from '../src/modules/taxation/service';
import { StateService } from '../src/modules/states/service';
import type { DirectivePayload } from '../src/modules/monetary/contracts';
import type { TaxRule } from '../src/modules/taxation/contracts';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority, establishTaxOffice, establishMoney } from './taxation-fixture';

type Fixture = Awaited<ReturnType<typeof monetaryFixture>>;
async function law(db: Database['db'], fixture: Fixture, rule: TaxRule): Promise<string> {
  const lawId = crypto.randomUUID();
  await new MonetaryDirectiveService(db).create(
    fixture.stateId,
    { id: fixture.founderId, admin: false },
    {
      idempotencyKey: crypto.randomUUID(),
      payload: {
        kind: 'ENACT_TAX_LAW',
        lawId,
        name: { en: 'Configured tax' },
        description: {},
        document: {},
        effectiveAt: new Date(0).toISOString(),
        rule,
      },
    },
  );
  return lawId;
}
async function balances(db: Database['db'], currencyId: string): Promise<Map<string, string>> {
  const rows = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.currencyId, currencyId));
  return new Map(rows.map((row) => [`${row.kind}:${row.ownerId}`, row.balanceMinor]));
}
// oxlint-disable-next-line max-lines-per-function -- Suite declaration retains the one complete persistent scenario.
describe('real tax settings and suspension', () => {
  // oxlint-disable-next-line max-lines-per-function, max-statements -- One immutable financial history verifies actual settings, failures and prospective restoration.
  it('settles sender and recipient laws to their approved accounts and retains laws during office suspension', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      const { db } = database;
      await migrate(db, { migrationsFolder: './drizzle' });
      const fixture = await monetaryFixture(db, 'Cfg');
      await addEconomicAuthority(db, fixture);
      await establishTaxOffice(db, fixture);
      const currencyId = await establishMoney(db, fixture);
      const actor = { id: fixture.founderId, admin: false };
      const money = new MonetaryService(db);
      const tax = new TaxationService(db);
      const rule: TaxRule = {
        event: 'PLAYER_TRANSFER',
        category: 'TRANSFER',
        taxpayer: 'SENDER',
        jurisdictions: ['CITIZENSHIP'],
        rateBps: 500,
        recipient: 'STATE_TREASURY',
        currencyIds: [],
      };
      await law(db, fixture, rule);
      const receiverLawId = await law(db, fixture, {
        ...rule,
        category: 'INCOME',
        taxpayer: 'RECIPIENT',
        base: { kind: 'EXCESS', thresholdMinor: '10000' },
        rateBps: 300,
        recipient: 'CENTRAL_BANK',
      });
      const request = {
        idempotencyKey: crypto.randomUUID(),
        currencyId,
        recipientId: fixture.citizenId,
        amountMinor: '30000',
        purpose: 'Exact liability evidence',
      };
      const quote = await money.quote(actor.id, request);
      expect(quote.calculation.totalDebitMinor).toBe('31500');
      expect(quote.calculation.recipientCreditMinor).toBe('29400');
      expect(quote.calculation.totalTaxMinor).toBe('2100');
      const before = await balances(db, currencyId);
      const operationId = await money.transfer(actor.id, { ...request, quoteId: quote.id });
      const operation = await tax.operation(operationId, actor.id);
      expect((await tax.operation(operationId, fixture.citizenId)).id).toBe(operationId);
      expect(operation.journals).toHaveLength(3);
      const { bank } = await money.state(fixture.stateId, actor);
      if (!bank) {
        throw new Error('Bank missing');
      }
      const after = await balances(db, currencyId);
      expect(after.get(`PLAYER:${fixture.founderId}`)).toBe('468500');
      expect(after.get(`PLAYER:${fixture.citizenId}`)).toBe('29400');
      expect(after.get(`TREASURY:${fixture.stateId}`)).toBe('1500');
      expect(
        BigInt(after.get(`CENTRAL_BANK:${bank.id}`) ?? '0') -
          BigInt(before.get(`CENTRAL_BANK:${bank.id}`) ?? '0'),
      ).toBe(600n);
      const [assessment] = await db
        .select()
        .from(taxAssessments)
        .where(
          and(
            eq(taxAssessments.operationId, operationId),
            eq(taxAssessments.taxpayerId, fixture.citizenId),
          ),
        );
      expect(assessment?.baseMinor).toBe('20000');
      expect(await money.transfer(actor.id, { ...request, quoteId: quote.id })).toBe(operationId);
      expect(await balances(db, currencyId)).toEqual(after);
      const bankModeration = new BankModerationService(db);
      const nextRequest = { ...request, idempotencyKey: crypto.randomUUID() };
      const bankQuote = await money.quote(actor.id, nextRequest);
      await bankModeration.review(bank.id, fixture.adminId, {
        directiveId: bank.establishmentDirectiveId,
        status: 'SUSPENDED',
        reason: 'Recipient safety check',
      });
      await expect(money.quote(actor.id, nextRequest)).rejects.toThrow('получатель налога');
      await expect(
        money.transfer(actor.id, { ...nextRequest, quoteId: bankQuote.id }),
      ).rejects.toThrow('получатель налога');
      expect(await balances(db, currencyId)).toEqual(after);
      await bankModeration.review(bank.id, fixture.adminId, {
        directiveId: bank.establishmentDirectiveId,
        status: 'ACTIVE',
        reason: 'Recipient restored',
      });
      const moderation = new TaxOfficeModerationService(db);
      const [office] = await moderation.list(fixture.adminId);
      if (!office) {
        throw new Error('Tax office missing');
      }
      await moderation.review(office.id, fixture.adminId, {
        directiveId: office.establishmentDirectiveId,
        status: 'SUSPENDED',
        reason: 'Administration suspended',
      });
      expect((await money.quote(actor.id, nextRequest)).calculation.totalTaxMinor).toBe('2100');
      expect((await tax.publicState(fixture.stateId, 'en')).laws).toHaveLength(2);
      await expect(law(db, fixture, rule)).rejects.toThrow('налоговая служба');
      const states = new StateService(db);
      await states.changeStatus(fixture.stateId, fixture.adminId, {
        status: 'SUSPENDED',
        reason: 'State suspension',
      });
      const pausedRequest = { ...request, idempotencyKey: crypto.randomUUID() };
      const paused = await money.quote(actor.id, pausedRequest);
      expect(paused.calculation.charges).toHaveLength(0);
      const pausedId = await money.transfer(actor.id, { ...pausedRequest, quoteId: paused.id });
      expect((await tax.operation(pausedId, actor.id)).journals).toHaveLength(1);
      await states.changeStatus(fixture.stateId, fixture.adminId, {
        status: 'ACTIVE',
        reason: 'State restored',
      });
      expect((await money.quote(actor.id, nextRequest)).calculation.totalTaxMinor).toBe('2100');
      expect((await tax.operation(pausedId, actor.id)).calculation.totalTaxMinor).toBe('0');
      expect((await tax.operation(operationId, actor.id)).calculation).toEqual(
        operation.calculation,
      );
      await moderation.review(office.id, fixture.adminId, {
        directiveId: office.establishmentDirectiveId,
        status: 'ACTIVE',
        reason: 'Management restored',
      });
      const [previous] = await db
        .select()
        .from(taxLawRevisions)
        .where(eq(taxLawRevisions.lawId, receiverLawId));
      if (!previous) {
        throw new Error('Law missing');
      }
      const payload: DirectivePayload = {
        kind: 'AMEND_TAX_LAW',
        lawId: receiverLawId,
        baseRevisionId: previous.id,
        name: { en: 'Amended withholding' },
        description: {},
        document: {},
        effectiveAt: new Date().toISOString(),
        rule: {
          ...previous.rule,
          base: { kind: 'FULL_AMOUNT' },
          category: 'CONTRIBUTION',
          recipient: 'STATE_TREASURY',
        },
      };
      await new MonetaryDirectiveService(db).create(fixture.stateId, actor, {
        payload,
        idempotencyKey: crypto.randomUUID(),
      });
      await expect(
        money.transfer(actor.id, { ...nextRequest, quoteId: bankQuote.id }),
      ).rejects.toThrow('изменились');
      const changed = await money.quote(actor.id, nextRequest);
      expect(changed.calculation.recipientCreditMinor).toBe('29100');
      expect(
        changed.calculation.charges.find((charge) => charge.taxpayer === 'RECIPIENT')?.claims[0]
          ?.category,
      ).toBe('CONTRIBUTION');
      const supply = await db
        .select({ sum: sql<string>`sum(${financialAccounts.balanceMinor})::text` })
        .from(financialAccounts)
        .where(
          and(
            eq(financialAccounts.currencyId, currencyId),
            sql`${financialAccounts.kind} <> 'ISSUANCE'`,
          ),
        );
      expect(supply[0]?.sum).toBe('1000000');
      expect(await db.select().from(economicOperations)).toHaveLength(2);
      expect((await db.select().from(ledgerTransactions)).length).toBeGreaterThan(3);
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
