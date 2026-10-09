import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Database } from '../../db';
import { authSessions, users, userRoles } from '../../db/schema';
import { permissionsFor } from '../permissions/policy';
import type { Principal } from '../identity/contracts';
import { HTTP, DomainError } from '../errors';

const TOKEN_BYTES = 32;
const DAY_MS = 86_400_000;
const IDLE_DAYS = 14;
const ABSOLUTE_DAYS = 30;
const MAX_USER_AGENT_LENGTH = 256;
const IDLE_MS = IDLE_DAYS * DAY_MS;
const ABSOLUTE_MS = ABSOLUTE_DAYS * DAY_MS;
const TOUCH_INTERVAL_MS = 3_600_000;
function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
interface Authenticated {
  readonly principal: Principal;
  readonly sessionId: string;
}
class SessionService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }

  public async issue(userId: string, userAgent?: string): Promise<string> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const now = Date.now();
    await this.db.insert(authSessions).values({
      userId,
      tokenHash: tokenHash(token),
      expiresAt: new Date(now + IDLE_MS),
      absoluteExpiresAt: new Date(now + ABSOLUTE_MS),
      userAgent: userAgent?.slice(0, MAX_USER_AGENT_LENGTH),
    });
    return token;
  }

  public async authenticate(token: string | undefined): Promise<Authenticated> {
    if (token === undefined || token.length === 0 || !/^[A-Za-z0-9_-]{43}$/u.test(token)) {
      throw new DomainError(HTTP.unauthenticated, 'UNAUTHENTICATED', 'Войдите в аккаунт');
    }
    const now = new Date();
    const [record] = await this.db
      .select({ session: authSessions, user: users })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash(token)),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
          gt(authSessions.absoluteExpiresAt, now),
        ),
      );
    if (!record || record.user.status !== 'ACTIVE') {
      throw new DomainError(HTTP.unauthenticated, 'UNAUTHENTICATED', 'Сессия недоступна');
    }
    const roles = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, record.user.id));
    if (now.getTime() - record.session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.db
        .update(authSessions)
        .set({
          lastSeenAt: now,
          expiresAt: new Date(
            Math.min(now.getTime() + IDLE_MS, record.session.absoluteExpiresAt.getTime()),
          ),
        })
        .where(and(eq(authSessions.id, record.session.id), isNull(authSessions.revokedAt)));
    }
    const principal: Principal = {
      id: record.user.id,
      username: record.user.username,
      status: record.user.status,
      createdAt: record.user.createdAt.toISOString(),
      currentSkinId: record.user.currentSkinId,
      roles: roles.map((row) => row.role),
      permissions: permissionsFor(roles.map((row) => row.role)),
    };
    return { principal, sessionId: record.session.id };
  }

  public async revoke(sessionId: string, userId: string): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)));
  }

  public async revokeAll(userId: string): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
  }
}

export { tokenHash, type Authenticated, SessionService };
