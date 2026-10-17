// oxlint-disable max-lines-per-function, max-statements -- Real PostgreSQL precision, pagination and HTTP isolation share the completed money fixture.
// oxlint-disable no-magic-numbers, unicorn/no-await-expression-member -- Fixture counts and direct awaited HTTP assertions are test data.
import { expect } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../src/db';
import {
  currencies,
  monetaryVotes,
  financialAccounts,
  ledgerTransactions,
  ledgerPostings,
} from '../src/db/schema';
import { createApp } from '../src/app';
import { IdentityService } from '../src/modules/identity/service';
import { MonetaryService } from '../src/modules/monetary/service';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MAX_MINOR } from '../src/modules/monetary/domain';
import { StateMonetarySchema } from '../src/modules/monetary/contracts';
import type { DirectivePayload } from '../src/modules/monetary/contracts';

function assertLargeStatistics(value: Awaited<ReturnType<MonetaryService['state']>>): void {
  const largeState = StateMonetarySchema.parse(value);
  expect(largeState.currency?.supplyMinor).toBe(MAX_MINOR.toString());
  expect(BigInt(largeState.currency?.grossIssuance30dMinor ?? '0')).toBeGreaterThan(MAX_MINOR);
  expect(largeState.currency?.availableIssuanceMinor).toBe('0');
  expect(largeState.currency?.remainingIssuanceMinor).toBe('0');
}

async function assertMutationRateLimit(
  app: ReturnType<typeof createApp>,
  input: Readonly<{
    headers: Readonly<Record<string, string>>;
    stateId: string;
    currencyId: string;
  }>,
): Promise<void> {
  const request = {
    method: 'POST',
    headers: input.headers,
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      payload: { kind: 'ISSUE', currencyId: input.currencyId, amountMinor: '1', purpose: '' },
    }),
  };
  for (let index = 1; index < 300; index += 1) {
    expect(
      // oxlint-disable-next-line no-await-in-loop -- Exhaust one authenticated actor's window through real HTTP mutations.
      (await app.request(`/api/v1/account/states/${input.stateId}/monetary/directives`, request))
        .status,
    ).toBe(404);
  }
  expect(
    (await app.request(`/api/v1/account/states/${input.stateId}/monetary/directives`, request))
      .status,
  ).toBe(429);
  expect((await app.request('/api/v1/account/wallet', { headers: input.headers })).status).toBe(
    200,
  );
}
async function assertMonetaryReliability(
  db: Database['db'],
  fixture: Readonly<{ stateId: string; founderId: string; citizenId: string; currencyId: string }>,
): Promise<void> {
  const money = new MonetaryService(db);
  const directives = new MonetaryDirectiveService(db);
  const citizen = { id: fixture.citizenId, admin: false };
  const command = async (payload: DirectivePayload): Promise<string> =>
    await directives.create(fixture.stateId, citizen, {
      payload,
      idempotencyKey: crypto.randomUUID(),
    });
  await command({
    kind: 'CHANGE_POLICY',
    currencyId: fixture.currencyId,
    policy: {
      maxSupplyMinor: null,
      maxGrossIssuance30dMinor: null,
      maxIssuancePerOperationMinor: null,
    },
  });
  const before = await money.state(fixture.stateId, citizen);
  const [issuanceAccount] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.currencyId, fixture.currencyId),
        eq(financialAccounts.kind, 'ISSUANCE'),
      ),
    );
  const bankAccount = before.accounts.find((account) => account.kind === 'CENTRAL_BANK');
  const policyId = before.currency?.policy?.id;
  const establishmentId = before.bank?.establishmentDirectiveId;
  if (!issuanceAccount || !bankAccount || policyId === undefined || establishmentId === undefined) {
    throw new Error('Missing accounting fixture');
  }
  const [initialCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ledgerTransactions);
  await expect(
    db.transaction(async (transaction) => {
      const id = crypto.randomUUID();
      await transaction.insert(ledgerTransactions).values({
        id,
        currencyId: fixture.currencyId,
        directiveId: establishmentId,
        policyRevisionId: policyId,
        actorId: fixture.citizenId,
        idempotencyKey: crypto.randomUUID(),
        payloadHash: '',
        kind: 'ISSUE',
        amountMinor: '1',
        purpose: 'Missing supply update must roll back',
      });
      await transaction.insert(ledgerPostings).values([
        {
          transactionId: id,
          currencyId: fixture.currencyId,
          accountId: issuanceAccount.id,
          deltaMinor: '-1',
        },
        {
          transactionId: id,
          currencyId: fixture.currencyId,
          accountId: bankAccount.id,
          deltaMinor: '1',
        },
      ]);
    }),
  ).rejects.toThrow();
  const [finalCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ledgerTransactions);
  expect(finalCount?.count).toBe(initialCount?.count);
  expect(
    (await money.state(fixture.stateId, citizen)).accounts.find(
      (account) => account.kind === 'CENTRAL_BANK',
    )?.balanceMinor,
  ).toBe(bankAccount.balanceMinor);
  const supply = before.currency?.supplyMinor;
  if (supply === undefined) {
    throw new Error('Missing supply');
  }
  await command({
    kind: 'ISSUE',
    currencyId: fixture.currencyId,
    amountMinor: (MAX_MINOR - BigInt(supply)).toString(),
    purpose: 'Exact thirty digit issuance',
  });
  assertLargeStatistics(await money.state(fixture.stateId, citizen));
  await expect(
    command({ kind: 'ISSUE', currencyId: fixture.currencyId, amountMinor: '1', purpose: '' }),
  ).rejects.toThrow('диапазон');
  await command({
    kind: 'CHANGE_POLICY',
    currencyId: fixture.currencyId,
    policy: {
      maxSupplyMinor: '1',
      maxGrossIssuance30dMinor: null,
      maxIssuancePerOperationMinor: null,
    },
  });
  expect((await money.state(fixture.stateId, citizen)).currency?.supplyMinor).toBe(
    MAX_MINOR.toString(),
  );
  await command({
    kind: 'BANK_TRANSFER',
    currencyId: fixture.currencyId,
    amountMinor: '1000',
    purpose: 'Pagination fixture funds',
    recipient: { type: 'PLAYER', userId: fixture.citizenId },
  });
  for (let index = 0; index < 55; index += 1) {
    // oxlint-disable-next-line no-await-in-loop -- Each real transfer commits its own journal before testing deterministic history pages.
    await money.transfer(fixture.citizenId, {
      idempotencyKey: crypto.randomUUID(),
      currencyId: fixture.currencyId,
      recipientId: fixture.founderId,
      amountMinor: '1',
      purpose: `History ${index}`,
    });
  }
  const first = await money.wallet(fixture.citizenId);
  const second = await money.wallet(fixture.citizenId, 2);
  expect(first.transactions).toHaveLength(50);
  expect(first.hasMore).toBe(true);
  expect(second.transactions.length).toBeGreaterThan(0);
  expect(
    second.transactions.some((entry) => first.transactions.some((other) => other.id === entry.id)),
  ).toBe(false);
  const origin = 'https://money.test';
  const app = createApp({
    db,
    siteOrigin: origin,
    checkReady: async () => {
      await db.execute(sql`select 1`);
    },
  });
  const observerToken = await new IdentityService(db).register(
    'MoneyObserver',
    'A sufficiently long password',
  );
  const headers = {
    Origin: origin,
    Cookie: `helicraft_session=${observerToken}`,
    'Content-Type': 'application/json',
  };
  expect((await app.request('/api/v1/account/wallet')).status).toBe(401);
  expect(
    (await app.request(`/api/v1/account/states/${fixture.stateId}/monetary`, { headers })).status,
  ).toBe(404);
  expect((await app.request('/api/v1/admin/central-banks', { headers })).status).toBe(403);
  expect((await app.request('/api/v1/admin/monetary/directives', { headers })).status).toBe(403);
  expect((await app.request('/api/v1/account/wallet?page=0', { headers })).status).toBe(400);
  const [vote] = await db.select().from(monetaryVotes).limit(1);
  if (!vote) {
    throw new Error('Missing monetary vote');
  }
  expect(
    (await app.request(`/api/v1/account/votings/${vote.votingId}/monetary-directive`, { headers }))
      .status,
  ).toBe(404);
  const transfer = {
    idempotencyKey: crypto.randomUUID(),
    currencyId: fixture.currencyId,
    recipientId: fixture.founderId,
    amountMinor: '1',
    purpose: '',
    sourceOwnerId: fixture.citizenId,
  };
  expect(
    (
      await app.request('/api/v1/account/wallet/transfers', {
        method: 'POST',
        headers,
        body: JSON.stringify(transfer),
      })
    ).status,
  ).toBe(400);
  const attempt = await app.request(
    `/api/v1/account/states/${fixture.stateId}/monetary/directives`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        payload: { kind: 'ISSUE', currencyId: fixture.currencyId, amountMinor: '1', purpose: '' },
      }),
    },
  );
  expect(attempt.status).toBe(404);
  await assertMutationRateLimit(app, {
    headers,
    stateId: fixture.stateId,
    currencyId: fixture.currencyId,
  });
  await db
    .update(currencies)
    .set({ status: 'BLOCKED' })
    .where(eq(currencies.id, fixture.currencyId));
  await expect(
    money.transfer(fixture.citizenId, {
      idempotencyKey: crypto.randomUUID(),
      currencyId: fixture.currencyId,
      recipientId: fixture.founderId,
      amountMinor: '1',
      purpose: 'Blocked currency',
    }),
  ).rejects.toThrow('приостановлены');
  expect((await money.state(fixture.stateId, citizen)).currency?.availableIssuanceMinor).toBe('0');
}

export { assertMonetaryReliability };
