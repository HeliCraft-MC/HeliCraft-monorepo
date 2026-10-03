import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/db';
import { worldEvents } from '../src/db/schema';

describe('postgis persistence', () => {
  it('migrates PostGIS and persists a spatial world event', async () => {
    expect.assertions(3);
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6').start();
    const { pool, db } = createDatabase(container.getConnectionUri());
    try {
      await migrate(db, { migrationsFolder: './drizzle' });
      await db.execute(sql`select PostGIS_Version()`);
      const [event] = await db
        .insert(worldEvents)
        .values({ description: 'Hello world', position: { x: 10, y: 20 } })
        .returning();
      expect(event?.position).toStrictEqual({ x: 10, y: 20 });
      expect(event?.description).toBe('Hello world');
      const spatial = await db
        .select({ srid: sql<number>`ST_SRID(${worldEvents.position})` })
        .from(worldEvents);
      expect(spatial[0]?.srid).toBe(4326);
    } finally {
      await pool.end();
      await container.stop();
    }
  }, 120_000);
});
