import { and, eq, gt, isNull } from 'drizzle-orm';
import { authSessions, users, adminAuditLog } from '../../db/schema';
import { minecraftSessions } from '../../db/minecraft-schema';
import type { minecraftChallenges } from '../../db/minecraft-schema';
import { DomainError, HTTP } from '../errors';
import type { Transaction } from '../permissions/transaction';
import type { ServiceActor, GameSession, ChallengeRecord } from './contracts';
import { LEASE_MS, POLL_STALE_MS } from './lifecycle';
import type { SessionRow } from './lifecycle';

function unavailable(): DomainError {
  return new DomainError(
    HTTP.forbidden,
    'MINECRAFT_ADMISSION_DENIED',
    'Minecraft admission is unavailable',
  );
}
async function activeAccount(
  transaction: Transaction,
  id: string,
): Promise<typeof users.$inferSelect> {
  const [user] = await transaction.select().from(users).where(eq(users.id, id)).for('update');
  if (user?.status !== 'ACTIVE') {
    throw unavailable();
  }
  return user;
}
// oxlint-disable-next-line max-params -- The session ID, owner and validation instant are separate security checks.
async function activeWebSession(
  transaction: Transaction,
  sessionId: string,
  userId: string,
  now: Date,
): Promise<void> {
  const [session] = await transaction
    .select({ id: authSessions.id })
    .from(authSessions)
    .where(
      and(
        eq(authSessions.id, sessionId),
        eq(authSessions.userId, userId),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, now),
        gt(authSessions.absoluteExpiresAt, now),
      ),
    )
    .for('share');
  if (!session) {
    throw unavailable();
  }
}
function challengeView(row: typeof minecraftChallenges.$inferSelect, now: Date): ChallengeRecord {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    status:
      (row.status === 'WAITING_AUTH' || row.status === 'APPROVED') &&
      (row.expiresAt <= now || row.polledAt.getTime() + POLL_STALE_MS <= now.getTime())
        ? 'EXPIRED'
        : row.status,
  };
}
function sessionView(row: SessionRow, now: Date): GameSession {
  const expiresAt = new Date(
    Math.min(
      row.proxyExpiresAt.getTime(),
      row.paperExpiresAt?.getTime() ?? row.proxyExpiresAt.getTime(),
    ),
  );
  return {
    id: row.id,
    accountId: row.userId,
    username: row.username,
    joinedAt: row.joinedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    expiresAt: expiresAt.toISOString(),
    online: row.joinedAt !== null && row.endedAt === null && expiresAt > now,
  };
}
// oxlint-disable-next-line max-params -- Audit evidence records explicit actor, target, action and service source on the transaction.
async function audit(
  transaction: Transaction,
  userId: string,
  id: string,
  action: string,
  source: string,
): Promise<void> {
  await transaction.insert(adminAuditLog).values({
    actorId: userId,
    action: `minecraft.${action}`,
    targetType: 'minecraft',
    targetId: id,
    metadata: { source },
  });
}
async function sessionFor(
  transaction: Transaction,
  id: string,
  actor: ServiceActor,
): Promise<SessionRow> {
  const [lookup] = await transaction
    .select()
    .from(minecraftSessions)
    .where(eq(minecraftSessions.id, id));
  if (!lookup) {
    throw unavailable();
  }
  const user = await activeAccount(transaction, lookup.userId);
  const [row] = await transaction
    .select()
    .from(minecraftSessions)
    .where(eq(minecraftSessions.id, id))
    .for('update');
  const now = new Date();
  if (
    !row ||
    row.endedAt !== null ||
    row.proxyExpiresAt <= now ||
    (row.paperExpiresAt !== null && row.paperExpiresAt <= now) ||
    row.username !== user.username ||
    (actor.role === 'RIGEL' ? row.proxyId !== actor.id : row.backendId !== actor.backendId)
  ) {
    throw unavailable();
  }
  await activeWebSession(transaction, row.approvedSessionId, row.userId, now);
  return row;
}
function lease(): Date {
  return new Date(Date.now() + LEASE_MS);
}
export {
  unavailable,
  activeAccount,
  activeWebSession,
  challengeView,
  sessionView,
  audit,
  sessionFor,
  lease,
};
