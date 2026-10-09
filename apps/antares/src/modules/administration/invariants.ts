import { and, eq } from 'drizzle-orm';
import { userRoles, users } from '../../db/schema';
import type { Role } from '../permissions/policy';
import type { Transaction } from '../permissions/transaction';

async function activeOwners(transaction: Transaction): Promise<string[]> {
  const rows = await transaction
    .select({ id: users.id })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(and(eq(userRoles.role, 'OWNER'), eq(users.status, 'ACTIVE')));
  return rows.map((row) => row.id);
}
async function targetRoles(transaction: Transaction, id: string): Promise<Role[]> {
  const rows = await transaction
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, id));
  return rows.map((row) => row.role);
}
export { activeOwners, targetRoles };
