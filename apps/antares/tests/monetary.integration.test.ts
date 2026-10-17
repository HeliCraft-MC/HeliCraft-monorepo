// oxlint-disable max-lines, max-lines-per-function, max-statements -- One disposable PostgreSQL lifecycle exercises real governance, accounting, concurrency and SQL integrity together.
// oxlint-disable import/max-dependencies -- Integration composes real services without production bypass endpoints.
import { approveBankEstablishment } from './monetary-establishment-scenario';
import { assertMonetaryReliability } from './monetary-reliability-scenario';
import { assertMonetaryGovernance } from './monetary-governance-scenario';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { describe, expect, it } from 'vitest';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { createDatabase } from '../src/db';
import {
  currencies,
  financialAccounts,
  ledgerPostings,
  ledgerTransactions,
  monetaryDirectives,
  monetaryPolicyRevisions,
  stateOfficeHolders,
} from '../src/db/schema';
import { monetaryFixture, addMonetaryAuthority } from './monetary-fixture';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import { BankModerationService } from '../src/modules/monetary/moderation';
import { StateService } from '../src/modules/states/service';
import type { DirectivePayload } from '../src/modules/monetary/contracts';

function requiredPolicyId(id: string | undefined): string {
  if (id === undefined) {
    throw new Error('Missing policy');
  }
  return id;
}

function assertInitialStatistics(state: Awaited<ReturnType<MonetaryService['state']>>): void {
  expect(state.currency?.supplyMinor).toBe('60000');
  expect(state.currency?.grossIssuance30dMinor).toBe('60000');
  expect(state.currency?.remainingIssuanceMinor).toBe('40000');
  expect(state.currency?.availableIssuanceMinor).toBe('40000');
  expect(state.currency?.policy?.number).toBe(1);
  expect(state.policyHistory[0]?.number).toBe(1);
}
describe('monetary PostgreSQL invariants', () => {
  it('runs governance → bank ratification → currency/policy → issuance → treasury → two wallets atomically', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      await migrate(database.db, { migrationsFolder: './drizzle' });
      const { db } = database;
      const fixture = await monetaryFixture(db);
      const founder = { id: fixture.founderId, admin: false };
      const citizen = { id: fixture.citizenId, admin: false };
      const admin = { id: fixture.adminId, admin: true };
      const directives = new MonetaryDirectiveService(db);
      const money = new MonetaryService(db);
      const moderation = new BankModerationService(db);
      const establish: DirectivePayload = {
        kind: 'ESTABLISH_BANK',
        name: { ru: 'Центральный банк', en: 'Central Bank' },
        description: { en: 'Web institution charter' },
      };
      const command = async (payload: DirectivePayload): Promise<string> =>
        await directives.create(fixture.stateId, founder, {
          idempotencyKey: crypto.randomUUID(),
          payload,
        });
      await expect(command(establish)).rejects.toThrow('полномочие');
      await addMonetaryAuthority(db, fixture, true);
      let bankDirective = await command(establish);
      await approveBankEstablishment(db, fixture, bankDirective);
      const institution = await money.state(fixture.stateId, founder);
      const { bank } = institution;
      if (!bank) {
        throw new Error('Bank missing');
      }
      expect(bank.status).toBe('PENDING');
      await expect(
        command({
          kind: 'CREATE_CURRENCY',
          code: 'HCM',
          name: { en: 'Test money' },
          description: {},
        }),
      ).rejects.toThrow('активный');
      await expect(
        moderation.review(bank.id, fixture.citizenId, {
          directiveId: bankDirective,
          status: 'ACTIVE',
          reason: 'Reviewed',
        }),
      ).rejects.toThrow();
      await expect(
        moderation.review(bank.id, fixture.adminId, {
          directiveId: crypto.randomUUID(),
          status: 'ACTIVE',
          reason: 'Reviewed',
        }),
      ).rejects.toThrow();
      await moderation.review(bank.id, fixture.adminId, {
        directiveId: bankDirective,
        status: 'REJECTED',
        reason: 'Charter evidence requires a new application',
      });
      await expect(
        command({ kind: 'ISSUE', currencyId: crypto.randomUUID(), amountMinor: '1', purpose: '' }),
      ).rejects.toThrow('активный');
      const rejectedDirectiveId = bankDirective;
      bankDirective = await command(establish);
      await approveBankEstablishment(db, { ...fixture, previousBankId: bank.id }, bankDirective);
      await expect(
        moderation.review(bank.id, fixture.adminId, {
          directiveId: rejectedDirectiveId,
          status: 'ACTIVE',
          reason: 'Old application cannot be ratified',
        }),
      ).rejects.toThrow();
      await moderation.review(bank.id, fixture.adminId, {
        directiveId: bankDirective,
        status: 'ACTIVE',
        reason: 'Web institution ratified',
      });
      await expect(command(establish)).rejects.toThrow('уже');
      await command({
        kind: 'CREATE_CURRENCY',
        code: 'HCM',
        name: { en: 'Heli money', ru: 'Деньги' },
        description: {},
      });
      await expect(
        command({
          kind: 'CREATE_CURRENCY',
          code: 'HCM2',
          name: { en: 'Duplicate' },
          description: {},
        }),
      ).rejects.toThrow('зарегистрированы');
      const [currency] = await db.select().from(currencies);
      if (!currency) {
        throw new Error('Currency missing');
      }
      const issue = (amountMinor: string): DirectivePayload => ({
        kind: 'ISSUE',
        currencyId: currency.id,
        amountMinor,
        purpose: 'Issue to bank',
      });
      await expect(command(issue('1'))).rejects.toThrow('политику');
      await command({
        kind: 'CHANGE_POLICY',
        currencyId: currency.id,
        policy: {
          maxSupplyMinor: '100000',
          maxGrossIssuance30dMinor: '100000',
          maxIssuancePerOperationMinor: '80000',
        },
      });
      await expect(
        directives.create(fixture.stateId, citizen, {
          idempotencyKey: crypto.randomUUID(),
          payload: issue('1'),
        }),
      ).rejects.toThrow('полномочие');
      await expect(command(issue('90000'))).rejects.toThrow('лимит');
      await expect(
        directives.create(fixture.stateId, admin, {
          idempotencyKey: crypto.randomUUID(),
          payload: issue('1'),
        }),
      ).rejects.toThrow('полномочие');
      const key = crypto.randomUUID();
      const first = await directives.create(fixture.stateId, founder, {
        idempotencyKey: key,
        payload: issue('60000'),
      });
      expect(
        await directives.create(fixture.stateId, founder, {
          idempotencyKey: key,
          payload: issue('60000'),
        }),
      ).toBe(first);
      await expect(
        directives.create(fixture.stateId, founder, {
          idempotencyKey: key,
          payload: issue('60001'),
        }),
      ).rejects.toThrow('ключ');
      await expect(command(issue('50000'))).rejects.toThrow('лимит');
      let state = await money.state(fixture.stateId, founder);
      assertInitialStatistics(state);
      const firstPolicyId = requiredPolicyId(state.currency?.policy?.id);
      await expect(
        db
          .update(monetaryPolicyRevisions)
          .set({
            limits: {
              maxSupplyMinor: null,
              maxGrossIssuance30dMinor: null,
              maxIssuancePerOperationMinor: null,
            },
          })
          .where(eq(monetaryPolicyRevisions.id, firstPolicyId)),
      ).rejects.toThrow();

      expect(state.accounts.find((item) => item.kind === 'CENTRAL_BANK')?.balanceMinor).toBe(
        '60000',
      );
      expect(state.accounts.find((item) => item.kind === 'TREASURY')?.balanceMinor).toBe('0');
      await command({
        kind: 'BANK_TRANSFER',
        currencyId: currency.id,
        amountMinor: '20000',
        purpose: 'Budget',
        recipient: { type: 'TREASURY' },
      });
      await command({
        kind: 'TREASURY_TRANSFER',
        currencyId: currency.id,
        amountMinor: '10000',
        purpose: 'Grant',
        recipient: { type: 'PLAYER', userId: fixture.founderId },
      });
      const transfer = {
        idempotencyKey: crypto.randomUUID(),
        currencyId: currency.id,
        recipientId: fixture.citizenId,
        amountMinor: '6000',
        purpose: 'Personal payment',
      };
      const results = await Promise.all([
        money.transfer(fixture.founderId, transfer),
        money.transfer(fixture.founderId, transfer),
      ]);
      expect(results[0]).toBe(results[1]);
      await expect(
        money.transfer(fixture.founderId, { ...transfer, amountMinor: '1' }),
      ).rejects.toThrow('ключ');
      const concurrent = await Promise.allSettled([
        money.transfer(fixture.founderId, {
          ...transfer,
          idempotencyKey: crypto.randomUUID(),
          amountMinor: '3000',
        }),
        money.transfer(fixture.founderId, {
          ...transfer,
          idempotencyKey: crypto.randomUUID(),
          amountMinor: '3000',
        }),
      ]);
      expect(concurrent.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      const wallet = await money.wallet(fixture.founderId);
      expect(wallet.accounts[0]?.balanceMinor).toBe('1000');
      await command({
        kind: 'BURN',
        currencyId: currency.id,
        amountMinor: '10000',
        purpose: 'Burn bank funds',
      });
      expect((await money.state(fixture.stateId, founder)).currency?.supplyMinor).toBe('50000');
      expect((await money.state(fixture.stateId, founder)).currency?.grossIssuance30dMinor).toBe(
        '60000',
      );
      const parallelIssues = await Promise.allSettled([
        command(issue('30000')),
        command(issue('30000')),
      ]);
      expect(parallelIssues.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      await expect(command(issue('20000'))).rejects.toThrow('лимит');
      await expect(
        command({ kind: 'BURN', currencyId: currency.id, amountMinor: '999999', purpose: '' }),
      ).rejects.toThrow('Недостаточно');
      const [posted] = await db.select().from(ledgerTransactions).limit(1);
      if (!posted) {
        throw new Error('Missing journal');
      }
      await expect(
        db
          .update(ledgerTransactions)
          .set({ amountMinor: '1' })
          .where(eq(ledgerTransactions.id, posted.id)),
      ).rejects.toThrow();
      await expect(
        db.delete(ledgerPostings).where(eq(ledgerPostings.transactionId, posted.id)),
      ).rejects.toThrow();
      await expect(
        db
          .update(monetaryDirectives)
          .set({ payload: issue('1') })
          .where(eq(monetaryDirectives.id, first)),
      ).rejects.toThrow();
      await expect(
        db
          .update(financialAccounts)
          .set({ balanceMinor: '999' })
          .where(eq(financialAccounts.ownerId, fixture.founderId)),
      ).rejects.toThrow();
      await expect(
        db.insert(ledgerTransactions).values({
          currencyId: currency.id,
          actorId: fixture.founderId,
          idempotencyKey: crypto.randomUUID(),
          payloadHash: '',
          kind: 'TRANSFER',
          amountMinor: '1',
          purpose: '',
        }),
      ).rejects.toThrow();
      await moderation.review(bank.id, fixture.adminId, {
        directiveId: bankDirective,
        status: 'SUSPENDED',
        reason: 'Institution suspended',
      });
      await expect(command(issue('1'))).rejects.toThrow('активный');
      await money.transfer(fixture.founderId, {
        ...transfer,
        idempotencyKey: crypto.randomUUID(),
        amountMinor: '1',
      });
      const states = new StateService(db);
      await states.changeStatus(fixture.stateId, fixture.adminId, {
        status: 'SUSPENDED',
        reason: 'State suspended',
      });
      const publicRecord = await money.publicCurrency('HCM');
      expect(publicRecord.state.name).toBeNull();
      expect(publicRecord.state.slug).toBeNull();
      expect(JSON.stringify(publicRecord)).not.toContain('Personal payment');
      await money.transfer(fixture.founderId, {
        ...transfer,
        idempotencyKey: crypto.randomUUID(),
        amountMinor: '1',
      });
      await states.changeStatus(fixture.stateId, fixture.adminId, {
        status: 'ACTIVE',
        reason: 'Restored',
      });
      await moderation.review(bank.id, fixture.adminId, {
        directiveId: bankDirective,
        status: 'ACTIVE',
        reason: 'Restored',
      });
      await assertMonetaryGovernance(db, fixture);
      await db.transaction(async (transaction) => {
        await transaction
          .update(stateOfficeHolders)
          .set({ until: sql`clock_timestamp()` })
          .where(
            and(
              eq(stateOfficeHolders.officeId, fixture.officeId),
              isNull(stateOfficeHolders.until),
            ),
          );
        await transaction.insert(stateOfficeHolders).values({
          officeId: fixture.officeId,
          userId: fixture.citizenId,
          since: sql`clock_timestamp()`,
        });
      });
      await expect(command(issue('1'))).rejects.toThrow('полномочие');
      state = await money.state(fixture.stateId, admin);
      const [supply] = await db
        .select({ amount: sql<string>`sum(${financialAccounts.balanceMinor})::text` })
        .from(financialAccounts)
        .where(
          and(
            eq(financialAccounts.currencyId, currency.id),
            sql`${financialAccounts.kind} <> 'ISSUANCE'`,
          ),
        );
      expect(state.currency?.supplyMinor).toBe(supply?.amount);
      const [sum] = await db
        .select({ amount: sql<string>`sum(${ledgerPostings.deltaMinor})::text` })
        .from(ledgerPostings);
      expect(sum?.amount).toBe('0');
      await assertMonetaryReliability(db, { ...fixture, currencyId: currency.id });
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
