// oxlint-disable import/max-dependencies -- Upgrade verification composes real state, bank, currency and monetary services on disposable PostgreSQL.
// oxlint-disable max-lines-per-function -- An existing-history migration and the next real publication are one upgrade scenario.
import { mkdtemp, mkdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { z } from '@hono/zod-openapi';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import { currencies, monetaryDirectives, monetaryPolicyRevisions } from '../src/db/schema';
import { monetaryFixture, addMonetaryAuthority } from './monetary-fixture';
import { StateService } from '../src/modules/states/service';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import { BankModerationService } from '../src/modules/monetary/moderation';
import { monetaryHash } from '../src/modules/monetary/domain';
import type { DirectivePayload } from '../src/modules/monetary/contracts';

const NUMBER_MIGRATION = 15;
const JournalSchema = z.object({
  version: z.string(),
  dialect: z.string(),
  entries: z.array(
    z.object({
      idx: z.number(),
      version: z.string(),
      when: z.number(),
      tag: z.string(),
      breakpoints: z.boolean(),
    }),
  ),
});
async function legacyMigrations(): Promise<string> {
  const folder = await mkdtemp('/tmp/helicraft-monetary-migrations-');
  const journal = JournalSchema.parse(await Bun.file('./drizzle/meta/_journal.json').json());
  const entries = journal.entries.filter((entry) => entry.idx < NUMBER_MIGRATION);
  await mkdir(path.join(folder, 'meta'));
  await Promise.all(
    entries.map(async (entry) => {
      await copyFile(
        path.join('drizzle', `${entry.tag}.sql`),
        path.join(folder, `${entry.tag}.sql`),
      );
    }),
  );
  await Bun.write(
    path.join(folder, 'meta', '_journal.json'),
    JSON.stringify({ ...journal, entries }),
  );
  return folder;
}
describe('monetary policy revision upgrade', () => {
  it('numbers existing immutable policies without changing their history and publishes the next revision', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    const folder = await legacyMigrations();
    try {
      await migrate(database.db, { migrationsFolder: folder });
      const fixture = await monetaryFixture(database.db);
      await addMonetaryAuthority(database.db, fixture);
      const actor = { id: fixture.founderId, admin: false };
      const directives = new MonetaryDirectiveService(database.db);
      const command = async (payload: DirectivePayload): Promise<string> =>
        await directives.create(fixture.stateId, actor, {
          payload,
          idempotencyKey: crypto.randomUUID(),
        });
      await command({ kind: 'ESTABLISH_BANK', name: { en: 'Upgrade bank' }, description: {} });
      const [bank] = await new BankModerationService(database.db).list(fixture.adminId);
      if (!bank) {
        throw new Error('Missing upgrade bank');
      }
      await new BankModerationService(database.db).review(bank.id, fixture.adminId, {
        directiveId: bank.establishmentDirectiveId,
        status: 'ACTIVE',
        reason: 'Upgrade fixture',
      });
      await command({
        kind: 'CREATE_CURRENCY',
        code: 'UPG',
        name: { en: 'Upgrade currency' },
        description: {},
      });
      const [currency] = await database.db.select().from(currencies);
      if (!currency) {
        throw new Error('Missing upgrade currency');
      }
      const state = await new StateService(database.db).detail(fixture.stateId, 'en');
      const limits = [
        {
          maxSupplyMinor: '100',
          maxGrossIssuance30dMinor: null,
          maxIssuancePerOperationMinor: '100',
        },
        {
          maxSupplyMinor: '200',
          maxGrossIssuance30dMinor: null,
          maxIssuancePerOperationMinor: '150',
        },
      ];
      const historical: string[] = [];
      const publishedBase = Date.now();
      for (const [historyIndex, policy] of limits.entries()) {
        const publishedAt = new Date(publishedBase + historyIndex);
        const payload: DirectivePayload = {
          kind: 'CHANGE_POLICY',
          currencyId: currency.id,
          policy,
        };
        const directiveId = crypto.randomUUID();
        const policyId = crypto.randomUUID();
        // oxlint-disable-next-line no-await-in-loop -- Seed the two historical versions in deterministic order using the old schema.
        await database.db.transaction(async (transaction) => {
          await transaction.insert(monetaryDirectives).values({
            id: directiveId,
            stateId: fixture.stateId,
            governanceRevisionId: state.governanceRevisionId,
            payload,
            payloadHash: monetaryHash(payload),
            createdBy: actor.id,
            idempotencyKey: crypto.randomUUID(),
            status: 'APPLIED',
            appliedAt: publishedAt,
            createdAt: publishedAt,
          });
          await transaction.execute(
            sql`insert into monetary_policy_revisions (id, currency_id, directive_id, limits, created_at) values (${policyId}, ${currency.id}, ${directiveId}, ${JSON.stringify(policy)}::jsonb, ${publishedAt})`,
          );
        });
        historical.push(policyId);
      }
      const before = await database.db
        .select({
          id: monetaryPolicyRevisions.id,
          limits: monetaryPolicyRevisions.limits,
          createdAt: monetaryPolicyRevisions.createdAt,
          directiveId: monetaryPolicyRevisions.directiveId,
        })
        .from(monetaryPolicyRevisions)
        .orderBy(monetaryPolicyRevisions.createdAt, monetaryPolicyRevisions.id);
      await migrate(database.db, { migrationsFolder: './drizzle' });
      const after = await database.db
        .select({
          id: monetaryPolicyRevisions.id,
          limits: monetaryPolicyRevisions.limits,
          createdAt: monetaryPolicyRevisions.createdAt,
          directiveId: monetaryPolicyRevisions.directiveId,
        })
        .from(monetaryPolicyRevisions)
        .orderBy(monetaryPolicyRevisions.number);
      expect(after).toEqual(before);
      await expect(
        database.db
          .update(monetaryPolicyRevisions)
          .set({ number: NUMBER_MIGRATION })
          .where(eq(monetaryPolicyRevisions.id, historical[0] ?? '')),
      ).rejects.toThrow();
      await command({
        kind: 'CHANGE_POLICY',
        currencyId: currency.id,
        policy: {
          maxSupplyMinor: '300',
          maxGrossIssuance30dMinor: null,
          maxIssuancePerOperationMinor: '200',
        },
      });
      const money = await new MonetaryService(database.db).state(fixture.stateId, actor);
      expect(money.policyHistory.map((policy) => policy.number)).toEqual([3, 2, 1]);
      expect(money.policyHistory.slice(1).map((policy) => policy.id)).toEqual([
        historical[1],
        historical[0],
      ]);
      expect(money.currency?.policy?.number).toBe(3);
    } finally {
      await database.pool.end();
      await container.stop();
      await rm(folder, { recursive: true, force: true });
    }
  });
});
