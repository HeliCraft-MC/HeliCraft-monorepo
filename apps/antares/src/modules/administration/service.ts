import { activeOwners, targetRoles as rolesOfTarget } from './invariants';
import { and, eq, isNull } from 'drizzle-orm';

import { users, userRoles, authSessions, adminAuditLog } from '../../db/schema';
import type { Principal } from '../identity/contracts';
import { requirePermission } from '../permissions/policy';
import type { Role } from '../permissions/policy';
import { authorizeMutation } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';

import { AdministrationReader } from './reader';

const rank: Record<Role, number> = { PLAYER: 0, EDITOR: 1, MODERATOR: 2, ADMIN: 3, OWNER: 4 };
function highest(roles: readonly Role[]): number {
  return Math.max(...roles.map((role) => rank[role]));
}
class AdministrationService extends AdministrationReader {
  public async roles(id: string, roles: readonly Role[], principal: Principal): Promise<void> {
    requirePermission(principal.roles, 'users.roles.manage');
    await this.db.transaction(async (transaction) => {
      const activeRoles = await authorizeMutation(transaction, principal.id, 'users.roles.manage');
      const targetRoles = await rolesOfTarget(transaction, id);
      const [target] = await transaction.select().from(users).where(eq(users.id, id)).for('update');
      if (!target) {
        throw new DomainError(HTTP.notFound, 'USER_NOT_FOUND', 'Пользователь не найден');
      }
      if (
        !activeRoles.includes('OWNER') &&
        (highest(targetRoles) >= rank.ADMIN || highest(roles) >= rank.ADMIN)
      ) {
        throw new DomainError(
          HTTP.forbidden,
          'ROLE_BOUNDARY',
          'Только OWNER управляет ADMIN и OWNER',
        );
      }
      const owners = await activeOwners(transaction);
      if (
        target.status === 'ACTIVE' &&
        targetRoles.includes('OWNER') &&
        !roles.includes('OWNER') &&
        owners.length <= 1
      ) {
        throw new DomainError(
          HTTP.conflict,
          'LAST_OWNER',
          'Нельзя снять полномочия последнего OWNER',
        );
      }
      await transaction.delete(userRoles).where(eq(userRoles.userId, id));
      await transaction
        .insert(userRoles)
        .values([...new Set(['PLAYER' as const, ...roles])].map((role) => ({ userId: id, role })));
      await transaction.insert(adminAuditLog).values({
        actorId: principal.id,
        action: 'user.roles.changed',
        targetType: 'user',
        targetId: id,
        metadata: { roles: [...roles] },
      });
    });
  }
  public async status(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'BANNED',
    principal: Principal,
  ): Promise<void> {
    requirePermission(principal.roles, 'users.status.manage');
    await this.db.transaction(async (transaction) => {
      const activeRoles = await authorizeMutation(transaction, principal.id, 'users.status.manage');
      const targetRoles = await rolesOfTarget(transaction, id);
      if (!activeRoles.includes('OWNER') && highest(targetRoles) >= highest(activeRoles)) {
        throw new DomainError(
          HTTP.forbidden,
          'ROLE_BOUNDARY',
          'Нельзя менять статус пользователя с равными или более высокими правами',
        );
      }
      const owners = await activeOwners(transaction);
      if (status !== 'ACTIVE' && owners.includes(id) && owners.length <= 1) {
        throw new DomainError(HTTP.conflict, 'LAST_OWNER', 'Нельзя заблокировать последнего OWNER');
      }
      const updated = await transaction
        .update(users)
        .set({ status, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning({ id: users.id });
      if (updated.length === 0) {
        throw new DomainError(HTTP.notFound, 'USER_NOT_FOUND', 'Пользователь не найден');
      }
      if (status !== 'ACTIVE') {
        await transaction
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(authSessions.userId, id), isNull(authSessions.revokedAt)));
      }
      await transaction.insert(adminAuditLog).values({
        actorId: principal.id,
        action: 'user.status.changed',
        targetType: 'user',
        targetId: id,
        metadata: { status },
      });
    });
  }
  public async revokeSessions(id: string, principal: Principal): Promise<void> {
    requirePermission(principal.roles, 'users.sessions.revoke');
    const target = await this.details(id, principal);
    if (!principal.roles.includes('OWNER') && highest(target.roles) >= highest(principal.roles)) {
      throw new DomainError(HTTP.forbidden, 'ROLE_BOUNDARY', 'Недостаточно полномочий');
    }
    await this.db.transaction(async (transaction) => {
      const activeRoles = await authorizeMutation(
        transaction,
        principal.id,
        'users.sessions.revoke',
      );
      const targetRoles = await rolesOfTarget(transaction, id);
      if (!activeRoles.includes('OWNER') && highest(targetRoles) >= highest(activeRoles)) {
        throw new DomainError(HTTP.forbidden, 'ROLE_BOUNDARY', 'Недостаточно полномочий');
      }
      await transaction
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(authSessions.userId, id), isNull(authSessions.revokedAt)));
      await transaction.insert(adminAuditLog).values({
        actorId: principal.id,
        action: 'user.sessions.revoked',
        targetType: 'user',
        targetId: id,
      });
    });
  }
}

export { AdministrationService };
