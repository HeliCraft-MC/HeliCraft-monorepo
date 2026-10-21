// oxlint-disable import/max-dependencies -- An old-schema financial operation and the next actual payment verify additive upgrade compatibility.
import { rm } from 'node:fs/promises';
import { z } from '@hono/zod-openapi';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import {
  economicOperations,
  economicJournals,
  taxAssessments,
  taxLawRevisions,
} from '../src/db/schema';
import { account, playerAccount, post } from '../src/modules/monetary/ledger';
import { currencyRecord, monetaryActor } from '../src/modules/monetary/store';
import { monetaryHash } from '../src/modules/monetary/domain';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import { TaxationService } from '../src/modules/taxation/service';
import type { TaxCalculation, TaxCharge } from '../src/modules/taxation/contracts';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority, establishTaxOffice, establishMoney } from './taxation-fixture';
import { migrationsBefore } from './migration-fixture';

const FIRST_UPGRADE_MIGRATION = 20;
async function oldHistory(db: Database['db'], operationId: string): Promise<unknown> {
  const result = await db.execute(sql`select jsonb_build_object(
    'operation', (select to_jsonb(o) - array['initiator_id','sender_id','sender_kind','recipient_kind','company_decision_id'] from economic_operations o where id = ${operationId}),
    'assessments', (select jsonb_agg(to_jsonb(a) order by id) from tax_assessments a where operation_id = ${operationId}),
    'claims', (select jsonb_agg(to_jsonb(c) - 'regime_revision_id' order by law_id) from tax_assessment_claims c where operation_id = ${operationId}),
    'laws', (select jsonb_agg(to_jsonb(l) order by id) from tax_law_revisions l),
    'journals', (select jsonb_agg(to_jsonb(j) - 'company_decision_id' order by id) from ledger_transactions j),
    'postings', (select jsonb_agg(to_jsonb(p) order by transaction_id,account_id) from ledger_postings p),
    'balances', (select jsonb_agg(to_jsonb(b) order by id) from financial_accounts b)
  ) as snapshot`);
  return z.object({ snapshot: z.unknown() }).parse(result.rows[0]).snapshot;
}
// oxlint-disable-next-line max-lines-per-function -- Build one complete historical transaction using only the old schema, including its relational tax evidence.
async function legacyPayment(
  db: Database['db'],
  input: Readonly<{
    fixture: Awaited<ReturnType<typeof monetaryFixture>>;
    currencyId: string;
    lawId: string;
  }>,
): Promise<string> {
  return await db.transaction(async (transaction) => {
    const { fixture, currencyId, lawId } = input;
    const actorId = fixture.founderId;
    await monetaryActor(transaction, { id: actorId, admin: false });
    const currency = await currencyRecord(transaction, currencyId);
    const [revision] = await transaction
      .select()
      .from(taxLawRevisions)
      .where(eq(taxLawRevisions.lawId, lawId));
    if (!revision) {
      throw new Error('Legacy law missing');
    }
    const charge: TaxCharge = {
      key: `law:${lawId}`,
      claims: [
        {
          lawId,
          revisionId: revision.id,
          revision: 1,
          stateId: fixture.stateId,
          stateName: {},
          stateSlug: 'legacy',
          name: {},
          category: 'TRANSFER',
          rateBps: 500,
          evidence: [],
          nationalAmountMinor: '5',
        },
      ],
      treatyId: null,
      treatyRevisionId: null,
      treatyName: {},
      mode: 'NATIONAL',
      rateBps: 500,
      amountMinor: '5',
      allocations: [{ stateId: fixture.stateId, shareBps: 10_000, amountMinor: '5' }],
    };
    const calculation: TaxCalculation = {
      event: 'PLAYER_TRANSFER',
      currencyId,
      senderId: actorId,
      recipientId: fixture.citizenId,
      principalMinor: '100',
      totalDebitMinor: '105',
      totalTaxMinor: '5',
      charges: [charge],
    };
    const key = crypto.randomUUID();
    const hash = monetaryHash({ legacy: key });
    const id = await post(transaction, {
      actorId,
      key,
      hash,
      currency,
      kind: 'TRANSFER',
      amountMinor: '100',
      purpose: 'Old immutable payment',
      source: await account(transaction, { currencyId, kind: 'PLAYER', ownerId: actorId }),
      target: await playerAccount(transaction, currencyId, fixture.citizenId),
      directiveId: null,
      policyRevisionId: null,
    });
    await transaction.execute(sql`insert into economic_operations (id,actor_id,recipient_id,currency_id,idempotency_key,command_hash,event,calculation)
      values (${id},${actorId},${fixture.citizenId},${currencyId},${key},${hash},'PLAYER_TRANSFER',${JSON.stringify(calculation)}::jsonb)`);
    await transaction.insert(economicJournals).values({ journalId: id, operationId: id });
    const assessmentId = crypto.randomUUID();
    await transaction.insert(taxAssessments).values({
      id: assessmentId,
      operationId: id,
      assessmentKey: charge.key,
      taxpayerId: actorId,
      currencyId,
      baseMinor: '100',
      charge,
    });
    await transaction.execute(
      sql`insert into tax_assessment_claims(assessment_id,operation_id,law_id,revision_id) values (${assessmentId},${id},${lawId},${revision.id})`,
    );
    const journalId = await post(transaction, {
      actorId,
      key: crypto.randomUUID(),
      hash,
      currency,
      kind: 'TRANSFER',
      amountMinor: '5',
      purpose: 'Legacy tax',
      source: await account(transaction, { currencyId, kind: 'PLAYER', ownerId: actorId }),
      target: await account(transaction, {
        currencyId,
        kind: 'TREASURY',
        ownerId: fixture.stateId,
      }),
      directiveId: null,
      policyRevisionId: null,
    });
    await transaction
      .insert(economicJournals)
      .values({ journalId, operationId: id, assessmentId, creditorStateId: fixture.stateId });
    return id;
  });
}
describe('taxation upgrade compatibility', () => {
  it('preserves old laws, balances, operations and journals and starts fractional accrual prospectively', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    const folder = await migrationsBefore(FIRST_UPGRADE_MIGRATION);
    try {
      const { db } = database;
      await migrate(db, { migrationsFolder: folder });
      // Current seed services explicitly insert a nullable corporate source. It is removed
      // Before the old-schema snapshot and upgrade; no corporate identity or data is seeded.
      await db.execute(sql`alter table ledger_transactions add column company_decision_id uuid`);
      await db.execute(
        sql`create function bank_reserved_minor(uuid,uuid) returns numeric language sql as 'select 0::numeric'`,
      );
      const fixture = await monetaryFixture(db, 'Up');
      await addEconomicAuthority(db, fixture);
      await establishTaxOffice(db, fixture);
      const currencyId = await establishMoney(db, fixture);
      const lawId = crypto.randomUUID();
      const actor = { id: fixture.founderId, admin: false };
      await new MonetaryDirectiveService(db).create(fixture.stateId, actor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'ENACT_TAX_LAW',
          lawId,
          name: { en: 'Old sender tax' },
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
      const oldId = await legacyPayment(db, { fixture, currencyId, lawId });
      await db.execute(sql`alter table ledger_transactions drop column company_decision_id`);
      await db.execute(sql`drop function bank_reserved_minor(uuid,uuid)`);
      const before = await oldHistory(db, oldId);
      await migrate(db, { migrationsFolder: './drizzle' });
      expect(await oldHistory(db, oldId)).toEqual(before);
      const [upgraded] = await db
        .select()
        .from(economicOperations)
        .where(eq(economicOperations.id, oldId));
      expect(upgraded).toMatchObject({
        senderId: actor.id,
        initiatorId: actor.id,
        senderKind: 'PLAYER',
        recipientKind: 'PLAYER',
        companyDecisionId: null,
      });
      const oldCalculation = upgraded?.calculation;
      const tax = new TaxationService(db);
      expect(
        (await tax.operation(oldId, actor.id)).calculation.recipientCreditMinor,
      ).toBeUndefined();
      const money = new MonetaryService(db);
      const request = {
        idempotencyKey: crypto.randomUUID(),
        currencyId,
        recipientId: fixture.citizenId,
        amountMinor: '1',
        purpose: 'New exact obligation',
      };
      const quote = await money.quote(actor.id, request);
      expect(quote.calculation.totalTaxMinor).toBe('0');
      expect(quote.calculation.charges[0]?.allocations[0]?.accrual?.remainderBefore).toBe('0');
      const newId = await money.transfer(actor.id, { ...request, quoteId: quote.id });
      expect(
        (await tax.operation(newId, actor.id)).calculation.charges[0]?.allocations[0]?.accrual
          ?.remainderAfter,
      ).toBe('5000000');
      expect(
        (await db.select().from(economicOperations).where(eq(economicOperations.id, oldId)))[0]
          ?.calculation,
      ).toEqual(oldCalculation);
      await expect(
        db.update(taxLawRevisions).set({ number: 99 }).where(eq(taxLawRevisions.lawId, lawId)),
      ).rejects.toThrow();
    } finally {
      await database.pool.end();
      await container.stop();
      await rm(folder, { recursive: true, force: true });
    }
  });
});
