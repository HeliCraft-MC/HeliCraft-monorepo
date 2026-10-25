import { and, eq, isNull, or, lte } from 'drizzle-orm';
import type { Database } from '../../db';
import { minecraftSessions, minecraftEvents, minecraftChallenges } from '../../db/minecraft-schema';
import type { Transaction } from '../permissions/transaction';

const LEASE_MS = 45_000;
const CHALLENGE_MS = 120_000;
const POLL_STALE_MS = 15_000;
const MAX_ATTEMPTS = 5;
type SessionRow = typeof minecraftSessions.$inferSelect;
// oxlint-disable-next-line max-params -- Session event evidence uses the transaction, verified session, service source, reason and instant.
async function endSession(
  transaction: Transaction,
  session: SessionRow,
  source: string,
  reason: string,
  now: Date,
): Promise<void> {
  const ended = await transaction
    .update(minecraftSessions)
    .set({ endedAt: now, endReason: reason })
    .where(and(eq(minecraftSessions.id, session.id), isNull(minecraftSessions.endedAt)))
    .returning({ id: minecraftSessions.id });
  if (ended.length > 0 && session.joinedAt !== null) {
    await transaction
      .insert(minecraftEvents)
      .values({
        sessionId: session.id,
        actorId: session.userId,
        type: 'MINECRAFT_SESSION_ENDED',
        source,
        reason,
        occurredAt: now,
      })
      .onConflictDoNothing();
  }
}
// oxlint-disable-next-line max-params -- Invalidation can target one approving web session or the entire account.
async function invalidateMinecraft(
  transaction: Transaction,
  userId: string,
  reason: string,
  webSessionId?: string,
): Promise<void> {
  const now = new Date();
  await transaction
    .update(minecraftChallenges)
    .set({ status: 'DISCONNECTED' })
    .where(
      and(
        eq(minecraftChallenges.userId, userId),
        or(
          eq(minecraftChallenges.status, 'WAITING_AUTH'),
          eq(minecraftChallenges.status, 'APPROVED'),
        ),
        webSessionId === undefined
          ? undefined
          : eq(minecraftChallenges.approvedSessionId, webSessionId),
      ),
    );
  const sessions = await transaction
    .select()
    .from(minecraftSessions)
    .where(
      and(
        eq(minecraftSessions.userId, userId),
        isNull(minecraftSessions.endedAt),
        webSessionId === undefined
          ? undefined
          : eq(minecraftSessions.approvedSessionId, webSessionId),
      ),
    );
  for (const session of sessions) {
    // oxlint-disable-next-line no-await-in-loop -- Events share this transaction connection.
    await endSession(transaction, session, 'antares', reason, now);
  }
}
async function expireMinecraft(db: Database['db']): Promise<void> {
  const now = new Date();
  await db
    .update(minecraftChallenges)
    .set({ status: 'EXPIRED' })
    .where(
      and(
        or(
          eq(minecraftChallenges.status, 'WAITING_AUTH'),
          eq(minecraftChallenges.status, 'APPROVED'),
        ),
        or(
          lte(minecraftChallenges.expiresAt, now),
          lte(minecraftChallenges.polledAt, new Date(now.getTime() - POLL_STALE_MS)),
        ),
      ),
    );
  await db.transaction(async (transaction) => {
    const sessions = await transaction
      .select()
      .from(minecraftSessions)
      .where(
        and(
          isNull(minecraftSessions.endedAt),
          or(
            lte(minecraftSessions.proxyExpiresAt, now),
            lte(minecraftSessions.paperExpiresAt, now),
          ),
        ),
      )
      .for('update');
    for (const session of sessions) {
      // oxlint-disable-next-line no-await-in-loop -- Lease events share this transaction connection.
      await endSession(transaction, session, 'antares', 'LEASE_EXPIRED', now);
    }
  });
}
export {
  LEASE_MS,
  CHALLENGE_MS,
  POLL_STALE_MS,
  MAX_ATTEMPTS,
  endSession,
  invalidateMinecraft,
  expireMinecraft,
  type SessionRow,
};
