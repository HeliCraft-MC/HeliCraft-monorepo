// Drizzle ORM clients for MySQL databases
// Wraps existing mysql2 pool connections with Drizzle ORM

import type { MySql2Database } from 'drizzle-orm/mysql2'
import { drizzle } from 'drizzle-orm/mysql2'
import { useMySQL } from '~/plugins/mySql'

import * as banlistSchema from './banlist/schema'
import * as defaultSchema from './default/schema'
import * as formsSchema from './forms/schema'

// Type aliases for better DX
export type DefaultDb = MySql2Database<typeof defaultSchema>
export type FormsDb = MySql2Database<typeof formsSchema>
export type BanlistDb = MySql2Database<typeof banlistSchema>

/**
 * Get Drizzle client for the default database (AUTH)
 * Uses the existing MySQL pool from useMySQL('default')
 */
export function useDefaultDb(): DefaultDb {
  const pool = useMySQL('default')
  return drizzle(pool, { schema: defaultSchema, mode: 'default' })
}

/**
 * Get Drizzle client for the forms database
 * Uses the existing MySQL pool from useMySQL('forms')
 */
export function useFormsDb(): FormsDb {
  const pool = useMySQL('forms')
  return drizzle(pool, { schema: formsSchema, mode: 'default' })
}

/**
 * Get Drizzle client for the banlist database
 * Uses the existing MySQL pool from useMySQL('banlist')
 */
export function useBanlistDb(): BanlistDb {
  const pool = useMySQL('banlist')
  return drizzle(pool, { schema: banlistSchema, mode: 'default' })
}

// Note: States database client intentionally omitted - functionality being removed
