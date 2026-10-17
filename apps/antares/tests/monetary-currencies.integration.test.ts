// oxlint-disable import/max-dependencies -- Real multi-state fixtures exercise independent currencies and PostgreSQL's composite posting constraints.
// oxlint-disable max-lines-per-function -- The multi-currency lifecycle verifies rollback and both currencies' balances together.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import { currencies, ledgerTransactions, ledgerPostings } from '../src/db/schema';
import { MonetaryService } from '../src/modules/monetary/service';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { BankModerationService } from '../src/modules/monetary/moderation';
import type { DirectivePayload } from '../src/modules/monetary/contracts';
import { monetaryFixture, addMonetaryAuthority } from './monetary-fixture';

async function bankFixture(
  db: Database['db'],
  suffix: string,
): Promise<{
  founderId: string;
  stateId: string;
  command: (payload: DirectivePayload) => Promise<string>;
}> {
  const fixture = await monetaryFixture(db, suffix);
  await addMonetaryAuthority(db, fixture);
  const directives = new MonetaryDirectiveService(db);
  const command = async (payload: DirectivePayload): Promise<string> =>
    await directives.create(
      fixture.stateId,
      { id: fixture.founderId, admin: false },
      { payload, idempotencyKey: crypto.randomUUID() },
    );
  const directiveId = await command({
    kind: 'ESTABLISH_BANK',
    name: { en: `Bank ${suffix}` },
    description: {},
  });
  const state = await new MonetaryService(db).state(fixture.stateId, {
    id: fixture.founderId,
    admin: false,
  });
  if (!state.bank) {
    throw new Error('Missing bank');
  }
  await new BankModerationService(db).review(state.bank.id, fixture.adminId, {
    directiveId,
    status: 'ACTIVE',
    reason: 'Multiple currency fixture',
  });
  return { founderId: fixture.founderId, stateId: fixture.stateId, command };
}
describe('independent national currencies', () => {
  it('keeps foreign-owned wallets separate, rejects duplicate codes and rolls back cross-currency postings', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      const { db } = database;
      await migrate(db, { migrationsFolder: './drizzle' });
      const first = await bankFixture(db, 'A');
      const second = await bankFixture(db, 'B');
      const currencyPayload = {
        kind: 'CREATE_CURRENCY',
        code: 'ONE',
        name: { en: 'First national currency' },
        description: {},
      } satisfies DirectivePayload;
      await first.command(currencyPayload);
      await expect(second.command(currencyPayload)).rejects.toThrow('код');
      await second.command({ ...currencyPayload, code: 'TWO' });
      const money = new MonetaryService(db);
      const firstState = await money.state(first.stateId, { id: first.founderId, admin: false });
      const secondState = await money.state(second.stateId, { id: second.founderId, admin: false });
      if (!firstState.currency || !secondState.currency) {
        throw new Error('Missing currencies');
      }
      expect(firstState.currency.supplyMinor).toBe('0');
      for (const item of [
        { fixture: first, currency: firstState.currency },
        { fixture: second, currency: secondState.currency },
      ]) {
        // oxlint-disable-next-line no-await-in-loop -- Each state publishes its own policy and ledger commands in order.
        await item.fixture.command({
          kind: 'CHANGE_POLICY',
          currencyId: item.currency.id,
          policy: {
            maxSupplyMinor: null,
            maxGrossIssuance30dMinor: null,
            maxIssuancePerOperationMinor: null,
          },
        });
        // oxlint-disable-next-line no-await-in-loop -- Issue into each independent bank before transferring to a foreign player.
        await item.fixture.command({
          kind: 'ISSUE',
          currencyId: item.currency.id,
          amountMinor: '100',
          purpose: '',
        });
        // oxlint-disable-next-line no-await-in-loop -- Recipient citizenship must not restrict a personal wallet's currency.
        await item.fixture.command({
          kind: 'BANK_TRANSFER',
          currencyId: item.currency.id,
          amountMinor: '100',
          purpose: '',
          recipient: { type: 'PLAYER', userId: first.founderId },
        });
      }
      const wallet = await money.wallet(first.founderId);
      expect(wallet.accounts.map((account) => account.balanceMinor)).toEqual(['100', '100']);
      const accountA = wallet.accounts.find(
        (account) => account.currencyId === firstState.currency?.id,
      );
      const accountB = wallet.accounts.find(
        (account) => account.currencyId === secondState.currency?.id,
      );
      if (!accountA || !accountB) {
        throw new Error('Missing independent wallets');
      }
      await expect(
        db.transaction(async (transaction) => {
          const id = crypto.randomUUID();
          await transaction.insert(ledgerTransactions).values({
            id,
            currencyId: accountA.currencyId,
            kind: 'TRANSFER',
            amountMinor: '1',
            purpose: 'Forbidden conversion',
            actorId: first.founderId,
            payloadHash: '',
            idempotencyKey: crypto.randomUUID(),
          });
          await transaction.insert(ledgerPostings).values([
            {
              transactionId: id,
              currencyId: accountA.currencyId,
              accountId: accountA.id,
              deltaMinor: '-1',
            },
            {
              transactionId: id,
              currencyId: accountA.currencyId,
              accountId: accountB.id,
              deltaMinor: '1',
            },
          ]);
        }),
      ).rejects.toThrow();
      expect((await money.wallet(first.founderId)).accounts).toEqual(wallet.accounts);
      await money.transfer(first.founderId, {
        idempotencyKey: crypto.randomUUID(),
        currencyId: accountA.currencyId,
        recipientId: second.founderId,
        amountMinor: '30',
        purpose: 'One currency only',
      });
      const after = await money.wallet(first.founderId);
      expect(after.accounts.find((account) => account.id === accountA.id)?.balanceMinor).toBe('70');
      expect(after.accounts.find((account) => account.id === accountB.id)?.balanceMinor).toBe(
        '100',
      );
      await expect(
        db.update(currencies).set({ code: 'NEW' }).where(eq(currencies.id, accountA.currencyId)),
      ).rejects.toThrow();
      await expect(
        db.delete(currencies).where(eq(currencies.id, accountA.currencyId)),
      ).rejects.toThrow();
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
