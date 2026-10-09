import { randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  users,
  userCredentials,
  userRoles,
  authSessions,
  usernameHistory,
  adminAuditLog,
} from '../../db/schema';
import { hashPassword, verifyPassword } from './password';
import { HTTP, DomainError, isUniqueConflict } from '../errors';
import { tokenHash } from '../sessions/service';

const DAY_MS = 86_400_000;
const TOKEN_BYTES = 32;
const IDLE_DAYS = 14;
const ABSOLUTE_DAYS = 30;
interface IssuedSession {
  readonly token: string;
  readonly values: typeof authSessions.$inferInsert;
}
const MAX_USER_AGENT_LENGTH = 256;
function newSession(userId: string, userAgent?: string): IssuedSession {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  const now = Date.now();
  return {
    token,
    values: {
      userId,
      tokenHash: tokenHash(token),
      expiresAt: new Date(now + IDLE_DAYS * DAY_MS),
      absoluteExpiresAt: new Date(now + ABSOLUTE_DAYS * DAY_MS),
      userAgent: userAgent?.slice(0, MAX_USER_AGENT_LENGTH),
    },
  };
}

export class IdentityService {
  private readonly dummyHash: Promise<string>;
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
    this.dummyHash = hashPassword(randomBytes(TOKEN_BYTES).toString('hex'));
  }

  public async register(username: string, password: string, userAgent?: string): Promise<string> {
    const passwordHash = await hashPassword(password);
    const id = crypto.randomUUID();
    const session = newSession(id, userAgent);
    try {
      await this.db.transaction(async (transaction) => {
        await transaction.insert(users).values({
          id,
          username,
          usernameNormalized: username.toLowerCase(),
          lastLoginAt: new Date(),
        });
        await transaction.insert(userCredentials).values({ userId: id, passwordHash });
        await transaction.insert(userRoles).values({ userId: id, role: 'PLAYER' });
        await transaction.insert(authSessions).values(session.values);
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new DomainError(HTTP.conflict, 'USERNAME_TAKEN', 'Этот ник уже занят');
      }
      throw error;
    }
    return session.token;
  }

  public async login(username: string, password: string, userAgent?: string): Promise<string> {
    const [record] = await this.db
      .select({ user: users, credential: userCredentials })
      .from(users)
      .innerJoin(userCredentials, eq(users.id, userCredentials.userId))
      .where(eq(users.usernameNormalized, username.toLowerCase()));
    const valid = await verifyPassword(
      password,
      record?.credential.passwordHash ?? (await this.dummyHash),
    );
    if (!record || !valid || record.user.status !== 'ACTIVE') {
      throw new DomainError(
        HTTP.unauthenticated,
        'INVALID_CREDENTIALS',
        'Неверный ник, пароль или аккаунт недоступен',
      );
    }
    const session = newSession(record.user.id, userAgent);
    await this.db.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(users)
        .where(eq(users.id, record.user.id))
        .for('update');
      const [credential] = await transaction
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, record.user.id));
      if (
        current?.status !== 'ACTIVE' ||
        credential?.passwordHash !== record.credential.passwordHash
      ) {
        throw new DomainError(HTTP.unauthenticated, 'INVALID_CREDENTIALS', 'Повторите вход');
      }
      await transaction.insert(authSessions).values(session.values);
      await transaction
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, record.user.id));
    });
    return session.token;
  }

  public async rename(userId: string, username: string, password: string): Promise<void> {
    try {
      await this.db.transaction(async (transaction) => {
        const [user] = await transaction
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .for('update');
        if (user?.status !== 'ACTIVE') {
          throw new DomainError(HTTP.forbidden, 'ACCOUNT_UNAVAILABLE', 'Аккаунт недоступен');
        }
        const [credential] = await transaction
          .select()
          .from(userCredentials)
          .where(eq(userCredentials.userId, userId));
        if (!credential || !(await verifyPassword(password, credential.passwordHash))) {
          throw new DomainError(HTTP.forbidden, 'WRONG_PASSWORD', 'Текущий пароль неверен');
        }
        const now = new Date();
        await transaction
          .update(users)
          .set({ username, usernameNormalized: username.toLowerCase(), updatedAt: now })
          .where(eq(users.id, userId));
        await transaction
          .insert(usernameHistory)
          .values({ userId, oldUsername: user.username, newUsername: username });
        await transaction.insert(adminAuditLog).values({
          actorId: userId,
          action: 'account.username.changed',
          targetType: 'user',
          targetId: userId,
          metadata: { oldUsername: user.username, newUsername: username },
        });
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new DomainError(HTTP.conflict, 'USERNAME_TAKEN', 'Этот ник уже занят');
      }
      throw error;
    }
  }

  public async changePassword(
    userId: string,
    currentPassword: string,
    password: string,
  ): Promise<void> {
    const passwordHash = await hashPassword(password);
    await this.db.transaction(async (transaction) => {
      const [user] = await transaction
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      if (user?.status !== 'ACTIVE') {
        throw new DomainError(HTTP.forbidden, 'ACCOUNT_UNAVAILABLE', 'Аккаунт недоступен');
      }
      const [credential] = await transaction
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, userId));
      if (!credential || !(await verifyPassword(currentPassword, credential.passwordHash))) {
        throw new DomainError(HTTP.forbidden, 'WRONG_PASSWORD', 'Текущий пароль неверен');
      }
      const now = new Date();
      await transaction
        .update(userCredentials)
        .set({ passwordHash, updatedAt: now })
        .where(eq(userCredentials.userId, userId));
      await transaction
        .update(users)
        .set({ passwordChangedAt: now, updatedAt: now })
        .where(eq(users.id, userId));
      await transaction
        .update(authSessions)
        .set({ revokedAt: now })
        .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
    });
  }
}
