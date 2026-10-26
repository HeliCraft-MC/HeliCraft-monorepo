import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import { createApp } from '../src/app';
import { spatialWorlds, spatialWorldEvents, users } from '../src/db/schema';
import { SpatialWorldService } from '../src/modules/spatial/worlds';
import { SpatialSnapshotService } from '../src/modules/spatial/snapshots';

const PATH = '/api/v1/internal/minecraft/spatial/worlds';
let container: StartedPostgreSqlContainer | null = null;
let database: Database | null = null;
function persistence(): Database {
  if (!database) {
    throw new Error('No test database');
  }
  return database;
}
function fixture(): { app: ReturnType<typeof createApp>; backendId: string } {
  const backendId = `deneb-${crypto.randomUUID()}`;
  const app = createApp({
    db: persistence().db,
    minecraftActors: [
      { id: 'deneb-discovery', role: 'DENEB', backendId, token: 'd'.repeat(43) },
      {
        id: 'other-discovery',
        role: 'DENEB',
        backendId: `other-${backendId}`,
        token: 'o'.repeat(43),
      },
      { id: 'rigel-discovery', role: 'RIGEL', backendId, token: 'r'.repeat(43) },
    ],
    checkReady: async () => {
      await Promise.resolve();
    },
  });
  return { app, backendId };
}
function request(
  worlds: { paperWorldId: string; dimension: string }[],
  token = 'd'.repeat(43),
  registerOverworld = true,
): RequestInit {
  return {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ worlds, registerOverworld }),
  };
}
const ResponseSchema = z.object({
  items: z.array(
    z.object({ id: z.uuid(), paperWorldId: z.uuid(), dimension: z.string(), version: z.number() }),
  ),
});
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
    .withDatabase('helicraft_discovery_test')
    .start();
  database = createDatabase(container.getConnectionUri());
  await migrate(database.db, { migrationsFolder: './drizzle' });
}, 120_000);
afterAll(async () => {
  await database?.pool.end();
  await container?.stop();
});
it('requires a scoped Deneb token and an explicit single primary world', async () => {
  const { app, backendId } = fixture();
  const world = { paperWorldId: crypto.randomUUID(), dimension: 'minecraft:overworld' };
  await Promise.all(
    ['wrong', 'r'.repeat(43)].map(async (token) => {
      const result = await app.request(PATH, request([world], token));
      expect(result.status).toBe(token === 'wrong' ? 401 : 403);
    }),
  );
  const cookieRequest = request([world]);
  const cookieHeaders = new Headers(cookieRequest.headers);
  cookieHeaders.set('Cookie', 'helicraft_session=forbidden');
  expect(
    (
      await app.request(PATH, {
        ...cookieRequest,
        headers: cookieHeaders,
      })
    ).status,
  ).toBe(401);
  expect(
    (await app.request(PATH, request([world, { ...world, paperWorldId: crypto.randomUUID() }])))
      .status,
  ).toBe(400);
  expect((await app.request(PATH, request([world, world]))).status).toBe(400);
  const readonly = await app.request(PATH, request([world], 'd'.repeat(43), false));
  expect(ResponseSchema.parse(await readonly.json()).items).toStrictEqual([]);
  const commons = await app.request(
    PATH,
    request(
      ['minecraft:the_nether', 'minecraft:the_end'].map((dimension) => ({
        paperWorldId: crypto.randomUUID(),
        dimension,
      })),
    ),
  );
  expect(ResponseSchema.parse(await commons.json()).items).toStrictEqual([]);
  expect(
    await persistence()
      .db.select()
      .from(spatialWorlds)
      .where(eq(spatialWorlds.backendId, backendId)),
  ).toHaveLength(0);
});
it('registers without an administrator account and is idempotent under concurrent restarts', async () => {
  const { app, backendId } = fixture();
  const world = { paperWorldId: crypto.randomUUID(), dimension: 'minecraft:overworld' };
  const results = await Promise.all(
    Array.from({ length: 6 }, async () => await app.request(PATH, request([world]))),
  );
  expect(results.every((result) => result.status === 200)).toBe(true);
  const records = await persistence()
    .db.select()
    .from(spatialWorlds)
    .where(eq(spatialWorlds.backendId, backendId));
  expect(records).toHaveLength(1);
  const [record] = records;
  if (!record) {
    throw new Error('No discovered world');
  }
  expect(record).toMatchObject({
    paperWorldId: world.paperWorldId,
    dimension: world.dimension,
    tileKey: 'minecraft_overworld',
    version: 0,
  });
  expect(await persistence().db.select().from(users)).toHaveLength(0);
  const worlds = await new SpatialWorldService(persistence().db).list();
  expect(worlds.find((item) => item.id === record.id)?.name).toStrictEqual({
    en: 'Overworld',
    ru: 'Обычный мир',
  });
  await persistence()
    .db.update(spatialWorlds)
    .set({ tileKey: 'custom_overworld', maxZoom: 4, extraZoom: 1 })
    .where(eq(spatialWorlds.id, record.id));
  expect((await app.request(PATH, request([world]))).status).toBe(200);
  const [preserved] = await persistence()
    .db.select()
    .from(spatialWorlds)
    .where(eq(spatialWorlds.id, record.id));
  expect(preserved).toMatchObject({
    tileKey: 'custom_overworld',
    maxZoom: 4,
    extraZoom: 1,
    version: 0,
  });
  expect(
    await persistence()
      .db.select()
      .from(spatialWorldEvents)
      .where(eq(spatialWorldEvents.worldId, record.id)),
  ).toHaveLength(1);
  await expect(
    persistence().db.execute(
      sql`update spatial_world_events set service_id = 'rewrite' where world_id = ${record.id}`,
    ),
  ).rejects.toThrow();
});
it('registers a recreated world separately, retains the old identity and rejects resurrection', async () => {
  const { app, backendId } = fixture();
  const original = { paperWorldId: crypto.randomUUID(), dimension: 'minecraft:overworld' };
  const [first] = ResponseSchema.parse(
    await (await app.request(PATH, request([original]))).json(),
  ).items;
  if (!first) {
    throw new Error('No first world');
  }
  const replacement = { ...original, paperWorldId: crypto.randomUUID() };
  const [next] = ResponseSchema.parse(
    await (await app.request(PATH, request([replacement]))).json(),
  ).items;
  if (!next) {
    throw new Error('No replacement world');
  }
  expect(next.id).not.toBe(first.id);
  const snapshot = await new SpatialSnapshotService(persistence().db).snapshot(next.id);
  expect(snapshot.version).toBe(0);
  expect(snapshot.territories).toStrictEqual([]);
  const stale = await app.request(PATH, request([original]));
  expect(ResponseSchema.parse(await stale.json()).items).toStrictEqual([]);
  const records = await persistence()
    .db.select()
    .from(spatialWorlds)
    .where(eq(spatialWorlds.backendId, backendId));
  expect(records).toHaveLength(2);
  expect(records.find((item) => item.id === first.id)).toMatchObject({
    status: 'RETIRED',
    paperWorldId: original.paperWorldId,
  });
  expect(records.find((item) => item.id === next.id)).toMatchObject({
    status: 'ACTIVE',
    version: 0,
  });
  const foreign = await app.request(PATH, request([replacement], 'o'.repeat(43)));
  const [foreignWorld] = ResponseSchema.parse(await foreign.json()).items;
  expect(foreignWorld?.id).not.toBe(next.id);
  expect(foreignWorld?.paperWorldId).toBe(next.paperWorldId);
});
