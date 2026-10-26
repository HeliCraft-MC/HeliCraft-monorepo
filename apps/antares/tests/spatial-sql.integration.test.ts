// oxlint-disable import/max-dependencies -- Direct SQL acceptance deliberately bypasses service-level global authorization locks in disposable persistence to test database publication guarantees.
import { expect, it } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import {
  activeTerritories,
  spatialWorlds,
  territorialEvents,
  territoryApplications,
  territoryReviews,
  territoryRevisions,
} from '../src/db/spatial-schema';
import { TerritoryDraftService } from '../src/modules/spatial/drafts';
import { SpatialWorldService } from '../src/modules/spatial/worlds';
import { SpatialHistoryService } from '../src/modules/spatial/history';
import type { TerritoryDraft } from '../src/modules/spatial/contracts';
import { monetaryFixture } from './monetary-fixture';
import { addTerritorialAuthority, rectangle } from './spatial-fixture';

interface Prepared {
  draft: TerritoryDraft;
  applicationId: string;
  actorId: string;
}
async function prepare(
  db: Database['db'],
  input: { worldId: string; stateId: string; actorId: string },
): Promise<Prepared> {
  const service = new TerritoryDraftService(db);
  const actor = { id: input.actorId, admin: false };
  const draft = await service.create(input.stateId, actor, {
    worldId: input.worldId,
    geometry: rectangle(0, 0, 8, 8),
    reason: { en: 'Competing real state proposal for SQL publication acceptance' },
    change: 'INITIAL',
  });
  await service.submit(draft.id, actor, draft.version);
  const [application] = await db
    .select({ id: territoryApplications.id })
    .from(territoryApplications)
    .where(eq(territoryApplications.draftId, draft.id));
  if (!application) {
    throw new Error('Completed state application missing');
  }
  return { draft, applicationId: application.id, actorId: input.actorId };
}
async function directPublication(
  db: Database['db'],
  prepared: Prepared,
  adminId: string,
): Promise<string> {
  return await db.transaction(async (transaction) => {
    await transaction.insert(territoryReviews).values({
      applicationId: prepared.applicationId,
      actorId: adminId,
      decision: 'APPROVE',
      reason: 'Direct independent-transaction conflict acceptance',
    });
    await transaction
      .update(territoryApplications)
      .set({ status: 'APPROVED' })
      .where(eq(territoryApplications.id, prepared.applicationId));
    if (prepared.draft.geometry === null) {
      throw new Error('No sealed geometry');
    }
    const [revision] = await transaction
      .insert(territoryRevisions)
      .values({
        stateId: prepared.draft.stateId,
        worldId: prepared.draft.worldId,
        previousRevisionId: null,
        number: 1,
        applicationId: prepared.applicationId,
        geometry: prepared.draft.geometry,
        area: 64,
        createdBy: prepared.actorId,
        ratifiedBy: adminId,
      })
      .returning({ id: territoryRevisions.id });
    if (!revision) {
      throw new Error('No inserted revision');
    }
    // Hold the real world lock briefly so the competing connection must wait on it.
    await transaction.execute(sql`select pg_sleep(0.1)`);
    await transaction.insert(activeTerritories).values({
      stateId: prepared.draft.stateId,
      worldId: prepared.draft.worldId,
      revisionId: revision.id,
    });
    return revision.id;
  });
}
it('requires atomic SQL publication and serializes overlapping direct writers without service locks', async () => {
  const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
    .withDatabase('helicraft_spatial_sql_test')
    .start();
  const database = createDatabase(container.getConnectionUri());
  try {
    await migrate(database.db, {
      migrationsFolder: new URL('../drizzle', import.meta.url).pathname,
    });
    const first = await monetaryFixture(database.db, 'SQ1');
    const second = await monetaryFixture(database.db, 'SQ2');
    await addTerritorialAuthority(database.db, first);
    await addTerritorialAuthority(database.db, second);
    const world = await new SpatialWorldService(database.db).register(first.adminId, {
      logicalKey: 'sql-concurrency',
      backendId: 'deneb',
      paperWorldId: crypto.randomUUID(),
      dimension: 'minecraft:overworld',
      name: { en: 'SQL isolated world' },
      tileKey: 'minecraft_overworld',
      maxZoom: 3,
      extraZoom: 2,
    });
    const left = await prepare(database.db, {
      worldId: world.id,
      stateId: first.stateId,
      actorId: first.founderId,
    });
    const right = await prepare(database.db, {
      worldId: world.id,
      stateId: second.stateId,
      actorId: second.founderId,
    });
    await expect(
      database.db.transaction(async (transaction) => {
        await transaction.insert(territoryReviews).values({
          applicationId: left.applicationId,
          actorId: first.adminId,
          decision: 'APPROVE',
          reason: 'Missing revision and publication',
        });
        await transaction
          .update(territoryApplications)
          .set({ status: 'APPROVED' })
          .where(eq(territoryApplications.id, left.applicationId));
      }),
    ).rejects.toThrow();
    expect(await database.db.select().from(territoryReviews)).toHaveLength(0);
    const outcomes = await Promise.allSettled([
      directPublication(database.db, left, first.adminId),
      directPublication(database.db, right, first.adminId),
    ]);
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((item) => item.status === 'rejected')).toHaveLength(1);
    expect(await database.db.select().from(territoryReviews)).toHaveLength(1);
    const revisions = await database.db.select().from(territoryRevisions);
    expect(revisions).toHaveLength(1);
    const [revision] = revisions;
    if (!revision) {
      throw new Error('Winning revision missing');
    }
    expect(await database.db.select().from(territorialEvents)).toHaveLength(1);
    expect((await database.db.select().from(spatialWorlds))[0]?.version).toBe(1);
    await expect(
      database.db
        .update(activeTerritories)
        .set({ stateId: revision.stateId === first.stateId ? second.stateId : first.stateId }),
    ).rejects.toThrow();
    await expect(
      database.db.insert(territorialEvents).values({
        revisionId: crypto.randomUUID(),
        worldId: world.id,
        version: 2,
        actorId: first.adminId,
      }),
    ).rejects.toThrow();
    await new SpatialWorldService(database.db).retire(
      world.id,
      first.adminId,
      'Disposable acceptance complete',
    );
    const history = await new SpatialHistoryService(database.db).list(
      world.id,
      revision.stateId,
      1,
    );
    expect(history.items[0]?.id).toBe(revision.id);
  } finally {
    await database.pool.end();
    await container.stop();
  }
});
