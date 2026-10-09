import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  users,
  userRoles,
  usernameHistory,
  adminAuditLog,
  contentDocuments,
} from '../../db/schema';
import type { Principal } from '../identity/contracts';
import { permissionsFor, requirePermission } from '../permissions/policy';
import type { Role } from '../permissions/policy';

import { DomainError, HTTP } from '../errors';

type AuditRecord = Omit<typeof adminAuditLog.$inferSelect, 'occurredAt'> & { occurredAt: string };
class AdministrationReader {
  protected readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async list(
    principal: Principal,
    query: {
      search: string;
      page: number;
      pageSize: number;
      status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
      role?: Role;
    },
  ): Promise<{ items: Principal[]; total: number }> {
    requirePermission(principal.roles, 'users.read');
    const roleIds = query.role
      ? this.db
          .select({ id: userRoles.userId })
          .from(userRoles)
          .where(eq(userRoles.role, query.role))
      : undefined;
    const condition = and(
      query.search
        ? or(
            ilike(
              users.username,
              `%${query.search.replaceAll('%', String.raw`\%`).replaceAll('_', String.raw`\_`)}%`,
            ),
            sql`${users.id}::text = ${query.search}`,
          )
        : undefined,
      query.status ? eq(users.status, query.status) : undefined,
      roleIds ? inArray(users.id, roleIds) : undefined,
    );
    const records = await this.db
      .select()
      .from(users)
      .where(condition)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const [total] = await this.db.select({ value: count() }).from(users).where(condition);
    return {
      items: await Promise.all(records.map(async (user) => await this.principalDto(user))),
      total: total?.value ?? 0,
    };
  }
  private async principalDto(user: typeof users.$inferSelect): Promise<Principal> {
    const roles = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, user.id));
    return {
      id: user.id,
      username: user.username,
      status: user.status,
      currentSkinId: user.currentSkinId,
      createdAt: user.createdAt.toISOString(),
      roles: roles.map((row) => row.role),
      permissions: permissionsFor(roles.map((row) => row.role)),
    };
  }
  public async details(
    id: string,
    principal: Principal,
  ): Promise<
    Principal & {
      lastLoginAt: string | null;
      history: { oldUsername: string; newUsername: string; changedAt: string }[];
    }
  > {
    requirePermission(principal.roles, 'users.read');
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    if (!user) {
      throw new DomainError(HTTP.notFound, 'USER_NOT_FOUND', 'Пользователь не найден');
    }
    const roles = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, id));
    const history = await this.db
      .select()
      .from(usernameHistory)
      .where(eq(usernameHistory.userId, id))
      .orderBy(desc(usernameHistory.changedAt));
    return {
      id: user.id,
      username: user.username,
      status: user.status,
      currentSkinId: user.currentSkinId,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      roles: roles.map((row) => row.role),
      permissions: permissionsFor(roles.map((row) => row.role)),
      history: history.map((row) => ({
        oldUsername: row.oldUsername,
        newUsername: row.newUsername,
        changedAt: row.changedAt.toISOString(),
      })),
    };
  }
  public async audit(
    principal: Principal,
    query: {
      page: number;
      pageSize: number;
      actor?: string;
      target?: string;
      action?: string;
      from?: Date;
      to?: Date;
    },
  ): Promise<{ items: AuditRecord[]; total: number }> {
    requirePermission(principal.roles, 'audit.read');
    const condition = and(
      query.target === undefined ? undefined : eq(adminAuditLog.targetId, query.target),
      query.actor === undefined ? undefined : eq(adminAuditLog.actorId, query.actor),
      query.action === undefined ? undefined : eq(adminAuditLog.action, query.action),
      query.from ? sql`${adminAuditLog.occurredAt} >= ${query.from}` : undefined,
      query.to ? sql`${adminAuditLog.occurredAt} <= ${query.to}` : undefined,
    );
    const rows = await this.db
      .select()
      .from(adminAuditLog)
      .where(condition)
      .orderBy(desc(adminAuditLog.occurredAt), desc(adminAuditLog.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const [total] = await this.db.select({ value: count() }).from(adminAuditLog).where(condition);
    return {
      items: rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        metadata: row.metadata,
        occurredAt: row.occurredAt.toISOString(),
      })),
      total: total?.value ?? 0,
    };
  }
  public async stats(principal: Principal): Promise<{
    users: number | null;
    activeUsers: number | null;
    publishedPages: number;
    draftPages: number;
    publishedChronicle: number;
  }> {
    requirePermission(principal.roles, 'content.read');
    const [stats] = await this.db
      .select({
        publishedPages: sql<number>`count(*) filter (where kind = 'PAGE' and status = 'PUBLISHED')::integer`,
        draftPages: sql<number>`count(*) filter (where kind = 'PAGE' and status = 'DRAFT')::integer`,
        publishedChronicle: sql<number>`count(*) filter (where kind = 'CHRONICLE' and status = 'PUBLISHED')::integer`,
      })
      .from(contentDocuments);
    const [accounts] = principal.permissions.includes('users.read')
      ? await this.db
          .select({
            users: count(),
            activeUsers: sql<number>`count(*) filter (where status = 'ACTIVE')::integer`,
          })
          .from(users)
      : [];
    return {
      users: accounts?.users ?? null,
      activeUsers: accounts?.activeUsers ?? null,
      publishedPages: stats?.publishedPages ?? 0,
      draftPages: stats?.draftPages ?? 0,
      publishedChronicle: stats?.publishedChronicle ?? 0,
    };
  }
}
export { AdministrationReader };
