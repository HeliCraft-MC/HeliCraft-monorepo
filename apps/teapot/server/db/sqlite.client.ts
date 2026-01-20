// Drizzle ORM client for SQLite database
// Wraps existing bun:sqlite connection with Drizzle ORM

import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { useSkinSQLite } from '~/plugins/skinSqlite';

import * as sqliteSchema from './sqlite/schema';

// Type alias for better DX
export type SqliteDb = BunSQLiteDatabase<typeof sqliteSchema>;

/**
 * Get Drizzle client for SQLite database (skins, gallery, file_refs)
 * Uses the existing SQLite connection from useSkinSQLite()
 */
export function useSqliteDb(): SqliteDb {
  const db = useSkinSQLite();
  return drizzle(db, { schema: sqliteSchema });
}
