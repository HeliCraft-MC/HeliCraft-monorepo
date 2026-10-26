import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import sharedFixtures from '../../../tests/fixtures/spatial.json';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import { TerritoryGeometrySchema } from '../src/modules/spatial/contracts';
import { analyzeGeometry } from '../src/modules/spatial/geometry';

const fixtures = z
  .array(
    z.object({
      name: z.string(),
      geometry: TerritoryGeometrySchema,
      points: z.array(z.object({ x: z.number(), z: z.number(), inside: z.boolean() })),
    }),
  )
  .parse(sharedFixtures);
let container: StartedPostgreSqlContainer | null = null;
let database: Database | null = null;
function persistence(): Database {
  if (database === null) {
    throw new Error('Disposable geometry database not initialized');
  }
  return database;
}
describe('shared PostGIS/JTS spatial fixtures', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft_spatial_geometry_test')
      .start();
    database = createDatabase(container.getConnectionUri());
    await migrate(database.db, { migrationsFolder: './drizzle' });
  });
  afterAll(async () => {
    await database?.pool.end();
    await container?.stop();
  });
  it.each(fixtures)('$name', async (fixture) => {
    const { db } = persistence();
    const analysis = await db.transaction(
      async (transaction) =>
        await analyzeGeometry(transaction, {
          stateId: crypto.randomUUID(),
          worldId: crypto.randomUUID(),
          geometry: fixture.geometry,
        }),
    );
    expect(analysis.valid).toBe(true);
    for (const point of fixture.points) {
      // oxlint-disable-next-line no-await-in-loop -- Verify each shared coordinate through real planar PostGIS semantics.
      const [result] = await db
        .select({
          inside: sql<boolean>`ST_Contains(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(fixture.geometry)}),0),ST_SetSRID(ST_MakePoint(${point.x},${point.z}),0))`,
        })
        .from(sql`(select 1) as fixture_point`);
      expect(result?.inside, `${fixture.name} X=${point.x} Z=${point.z}`).toBe(point.inside);
    }
  });
});
