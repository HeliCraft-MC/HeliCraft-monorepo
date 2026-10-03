import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { worldEvents } from './schema';

const CONNECTION_TIMEOUT_MS = 5000;
interface Database {
  readonly pool: Pool;
  readonly db: NodePgDatabase<{ worldEvents: typeof worldEvents }>;
}
function createDatabase(url: string): Database {
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS });
  return { pool, db: drizzle(pool, { schema: { worldEvents } }) };
}

export { createDatabase, type Database };
