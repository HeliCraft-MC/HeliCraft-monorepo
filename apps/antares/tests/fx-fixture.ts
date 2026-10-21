import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import { centralBanks } from '../src/db/schema';
import type { Transaction } from '../src/modules/permissions/transaction';
import type { DirectivePayload } from '../src/modules/monetary/contracts';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { monetaryActor } from '../src/modules/monetary/store';
import { monetaryFixture } from './monetary-fixture';
import { addEconomicAuthority, establishMoney } from './taxation-fixture';

type FxStateFixture = Awaited<ReturnType<typeof monetaryFixture>>;
interface FxFixture {
  container: StartedPostgreSqlContainer;
  db: Database;
  first: FxStateFixture;
  second: FxStateFixture;
  firstCurrency: string;
  secondCurrency: string;
  firstBank: string;
  secondBank: string;
}
async function createFxFixture(
  options: Readonly<{ migrationsFolder?: string }> = {},
): Promise<FxFixture> {
  const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
    .withDatabase('helicraft')
    .start();
  const db = createDatabase(container.getConnectionUri());
  try {
    await migrate(db.db, { migrationsFolder: options.migrationsFolder ?? './drizzle' });
    const first = await monetaryFixture(db.db, 'FxA');
    const second = await monetaryFixture(db.db, 'FxB');
    await addEconomicAuthority(db.db, first);
    await addEconomicAuthority(db.db, second);
    const firstCurrency = await establishMoney(db.db, first, 'FXA');
    const secondCurrency = await establishMoney(db.db, second, 'FXB');
    const banks = await db.db.select().from(centralBanks);
    const firstBank = banks.find((bank) => bank.stateId === first.stateId)?.id;
    const secondBank = banks.find((bank) => bank.stateId === second.stateId)?.id;
    if (firstBank === undefined || secondBank === undefined) {
      throw new Error('FX banks missing');
    }
    return { container, db, first, second, firstCurrency, secondCurrency, firstBank, secondBank };
  } catch (error) {
    await db.pool.end();
    await container.stop();
    throw error;
  }
}
async function fxCommand(
  fixture: FxFixture,
  state: FxStateFixture,
  payload: DirectivePayload,
): Promise<string> {
  return await new MonetaryDirectiveService(fixture.db.db).create(
    state.stateId,
    { id: state.founderId, admin: false },
    { idempotencyKey: crypto.randomUUID(), payload },
  );
}
async function fxTransaction<Result>(
  fixture: FxFixture,
  work: (transaction: Transaction) => Promise<Result>,
  actorId = fixture.first.founderId,
): Promise<Result> {
  return await fixture.db.db.transaction(async (transaction) => {
    await monetaryActor(transaction, { id: actorId, admin: false });
    return await work(transaction);
  });
}
function interbankTerms(
  fixture: FxFixture,
): Extract<DirectivePayload, { kind: 'APPROVE_INTERBANK_EXCHANGE' }> {
  return {
    kind: 'APPROVE_INTERBANK_EXCHANGE',
    tradeId: crypto.randomUUID(),
    terms: {
      first: {
        stateId: fixture.first.stateId,
        bankId: fixture.firstBank,
        currencyId: fixture.firstCurrency,
        amountMinor: '2000',
      },
      second: {
        stateId: fixture.second.stateId,
        bankId: fixture.secondBank,
        currencyId: fixture.secondCurrency,
        amountMinor: '1000',
      },
      expiresAt: '2099-01-01T00:00:00.000Z',
    },
  };
}
async function fundFxReserve(fixture: FxFixture): Promise<void> {
  const payload = interbankTerms(fixture);
  await fxCommand(fixture, fixture.first, payload);
  await fxCommand(fixture, fixture.second, payload);
}
export {
  createFxFixture,
  fxCommand,
  fxTransaction,
  interbankTerms,
  fundFxReserve,
  type FxFixture,
  type FxStateFixture,
};
