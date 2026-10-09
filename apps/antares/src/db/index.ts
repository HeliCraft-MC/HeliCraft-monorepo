import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  worldEvents,
  users,
  userCredentials,
  authSessions,
  userRoles,
  playerSkins,
  usernameHistory,
  contentDocuments,
  contentRevisions,
  contentRedirects,
  adminAuditLog,
} from './schema';

const schema = {
  worldEvents,
  users,
  userCredentials,
  authSessions,
  userRoles,
  playerSkins,
  usernameHistory,
  contentDocuments,
  contentRevisions,
  contentRedirects,
  adminAuditLog,
};

const CONNECTION_TIMEOUT_MS = 5000;
interface Database {
  readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;
}
function createDatabase(url: string): Database {
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS });
  return { pool, db: drizzle(pool, { schema }) };
}

export { createDatabase, type Database };
