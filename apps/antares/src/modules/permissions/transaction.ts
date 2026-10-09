import { eq, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { userRoles, users } from '../../db/schema';
import { DomainError, HTTP } from '../errors';
import { requirePermission } from './policy';
import type { Permission, Role } from './policy';

type Transaction = Parameters<Parameters<Database['db']['transaction']>[0]>[0];
const AUTHORIZATION_LOCK = 741_022;
async function authorizeMutation(
  transaction: Transaction,
  actorId: string,
  permission: Permission,
): Promise<Role[]> {
  await transaction.execute(sql`select pg_advisory_xact_lock(${AUTHORIZATION_LOCK})`);
  const [actor] = await transaction
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, actorId));
  if (actor?.status !== 'ACTIVE') {
    throw new DomainError(HTTP.forbidden, 'ACTOR_INACTIVE', 'Сессия администратора недоступна');
  }
  const rows = await transaction
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, actorId));
  const roles = rows.map((row) => row.role);
  requirePermission(roles, permission);
  return roles;
}
export { authorizeMutation, type Transaction };
