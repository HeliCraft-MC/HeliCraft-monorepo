import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import { adminAuditLog } from '../src/db/schema';
import { VotingService } from '../src/modules/voting/service';
import type { VotingInput } from '../src/modules/voting/contracts';
import { emptyConfiguration } from '../src/modules/states/domain';
import { monetaryFixture } from './monetary-fixture';

function input(userIds: string[], closeWhenDecided: boolean): VotingInput {
  return {
    title: { en: 'Automatic completion' },
    description: {},
    options: [
      { id: crypto.randomUUID(), label: { en: 'Yes' } },
      { id: crypto.randomUUID(), label: { en: 'No' } },
    ],
    electorate: { type: 'SPECIFIC_USERS', userIds },
    opensAt: new Date(Date.now() - 1000).toISOString(),
    closesAt: new Date(Date.now() + 3_600_000).toISOString(),
    rules: {
      ...emptyConfiguration().governance.votingDefaults,
      thresholdKind: 'SIMPLE_MAJORITY',
      closeWhenDecided,
    },
    maxSelections: 1,
    resultVisibility: 'AFTER_CLOSE',
  };
}

describe('automatic completion in the locked ballot transaction', () => {
  it('persists decided and full-turnout completion, reveals results, keeps the published window and rejects late ballots', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      await migrate(database.db, { migrationsFolder: './drizzle' });
      const players = await monetaryFixture(database.db, 'Ac');
      const voters = [players.founderId, players.citizenId, players.adminId];
      const service = new VotingService(database.db);
      await Promise.all(
        [true, false].map(async (early) => {
          const configuration = input(voters, early);
          const [yes] = configuration.options;
          if (yes === undefined) {
            throw new Error('Option missing');
          }
          const id = await service.create(players.adminId, configuration);
          await service.publish(id, players.adminId);
          await service.cast(id, players.founderId, { choices: [yes.id], abstain: false });
          expect((await service.detail(id, players.founderId, false)).status).toBe('OPEN');
          await service.cast(id, players.citizenId, { choices: [yes.id], abstain: false });
          expect((await service.detail(id, players.founderId, false)).status).toBe(
            early ? 'CLOSED' : 'OPEN',
          );
          if (!early) {
            await service.cast(id, players.adminId, { choices: [], abstain: true });
          }
          const detail = await service.detail(id, players.founderId, false);
          expect(detail.status).toBe('CLOSED');
          expect(detail.input.closesAt).toBe(configuration.closesAt);
          expect(detail.result?.options.find((option) => option.id === yes.id)?.approved).toBe(
            true,
          );
          await expect(
            service.cast(id, players.adminId, { choices: [yes.id], abstain: false }),
          ).rejects.toThrow();
          await service.tick();
          const audit = await database.db
            .select()
            .from(adminAuditLog)
            .where(eq(adminAuditLog.targetId, id));
          expect(audit.filter((row) => row.action.startsWith('voting.closed_early.'))).toHaveLength(
            1,
          );
        }),
      );
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
