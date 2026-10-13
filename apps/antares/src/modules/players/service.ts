import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { users } from '../../db/schema';

const PLAYER_SEARCH_LIMIT = 10;
async function searchPlayers(
  db: Database['db'],
  query: string,
): Promise<{ id: string; name: string }[]> {
  return await db
    .select({ id: users.id, name: users.username })
    .from(users)
    .where(
      and(
        eq(users.status, 'ACTIVE'),
        sql`starts_with(${users.usernameNormalized}, ${query.toLowerCase()})`,
      ),
    )
    .orderBy(asc(users.usernameNormalized))
    .limit(PLAYER_SEARCH_LIMIT);
}
async function getPlayers(
  db: Database['db'],
  ids: readonly string[],
): Promise<{ id: string; name: string }[]> {
  if (ids.length === 0) {
    return [];
  }
  return await db
    .select({ id: users.id, name: users.username })
    .from(users)
    .where(inArray(users.id, [...ids]))
    .orderBy(asc(users.usernameNormalized));
}
export { searchPlayers, getPlayers };
