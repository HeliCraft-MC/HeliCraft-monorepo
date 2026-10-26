import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../db';
import { users } from '../../db/schema';
import { minecraftChallenges, minecraftEvents, minecraftSessions } from '../../db/minecraft-schema';
import type { ServiceActor } from './contracts';
import { endSession, expireMinecraft } from './lifecycle';
import { activeAccount, challengeView, lease, sessionFor, sessionView, unavailable } from './store';
import { publicPlayerProfile } from '../players/profile';
import { resolveText } from '../localized-content/contracts';
import type { Locale } from '../localized-content/contracts';
import { readSiteSettings } from '../site-settings/service';

const HISTORY_LIMIT = 20;
class MinecraftSessions {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async admission(
    accountId: string,
    username: string,
    actor: ServiceActor,
  ): Promise<{ session: ReturnType<typeof sessionView>; backendId: string }> {
    return await this.db.transaction(async (transaction) => {
      await activeAccount(transaction, accountId);
      const [row] = await transaction
        .select({ id: minecraftSessions.id })
        .from(minecraftSessions)
        .where(and(eq(minecraftSessions.userId, accountId), isNull(minecraftSessions.endedAt)));
      if (!row) {
        throw unavailable();
      }
      const session = await sessionFor(transaction, row.id, actor);
      if (session.username !== username) {
        throw unavailable();
      }
      return { session: sessionView(session, new Date()), backendId: session.backendId };
    });
  }
  public async touch(
    id: string,
    actor: ServiceActor,
    operation: 'JOIN' | 'HEARTBEAT',
  ): Promise<{ session: ReturnType<typeof sessionView>; backendId: string }> {
    return await this.db.transaction(async (transaction) => {
      const row = await sessionFor(transaction, id, actor);
      const now = new Date();
      if (operation === 'JOIN' && row.joinedAt === null) {
        await transaction
          .insert(minecraftEvents)
          .values({
            sessionId: id,
            actorId: row.userId,
            type: 'MINECRAFT_SESSION_STARTED',
            source: actor.id,
            occurredAt: now,
          })
          .onConflictDoNothing();
      }
      const [updated] = await transaction
        .update(minecraftSessions)
        .set(
          actor.role === 'RIGEL'
            ? { proxyExpiresAt: lease() }
            : {
                paperExpiresAt: lease(),
                joinedAt: operation === 'JOIN' ? (row.joinedAt ?? now) : row.joinedAt,
              },
        )
        .where(eq(minecraftSessions.id, id))
        .returning();
      if (!updated) {
        throw unavailable();
      }
      return { session: sessionView(updated, now), backendId: row.backendId };
    });
  }
  public async close(id: string, actor: ServiceActor): Promise<void> {
    await this.db.transaction(async (transaction) => {
      const [row] = await transaction
        .select()
        .from(minecraftSessions)
        .where(eq(minecraftSessions.id, id))
        .for('update');
      if (
        !row ||
        (actor.role === 'RIGEL' ? row.proxyId !== actor.id : row.backendId !== actor.backendId)
      ) {
        throw unavailable();
      }
      await endSession(transaction, row, actor.id, 'DISCONNECTED', new Date());
    });
  }
  // oxlint-disable-next-line max-params -- The explicit identity, service scope and client locale are independently validated.
  public async profile(
    accountId: string,
    username: string,
    actor: ServiceActor,
    clientLocale: Locale,
  ): Promise<{
    accountId: string;
    username: string;
    serverName: string;
    states: string[];
    locale: Locale;
  }> {
    const admission = await this.admission(accountId, username, actor);
    const [approval] = await this.db
      .select({ locale: minecraftChallenges.locale })
      .from(minecraftSessions)
      .innerJoin(minecraftChallenges, eq(minecraftChallenges.id, minecraftSessions.challengeId))
      .where(eq(minecraftSessions.id, admission.session.id));
    const locale = approval?.locale ?? clientLocale;
    const profile = await publicPlayerProfile(this.db, accountId);
    const site = await readSiteSettings(this.db, {});
    return {
      accountId,
      username: profile.name,
      serverName: site.serverName,
      locale,
      // Public affiliation also includes historical founders; gameplay reports current citizenship only.
      states: profile.states
        .filter((state) => state.citizenSince !== null)
        .map((state) => resolveText(state.name, locale).value),
    };
  }
  // oxlint-disable-next-line max-lines-per-function -- One private read model combines identity, pending requests, lease and bounded event history.
  public async account(userId: string): Promise<{
    accountId: string;
    username: string;
    challenges: ReturnType<typeof challengeView>[];
    session: ReturnType<typeof sessionView> | null;
    lastJoinedAt: string | null;
    events: {
      id: string;
      type: typeof minecraftEvents.$inferSelect.type;
      occurredAt: string;
      reason: string | null;
    }[];
  }> {
    await expireMinecraft(this.db);
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user || user.status !== 'ACTIVE') {
      throw unavailable();
    }
    const challenges = await this.db
      .select()
      .from(minecraftChallenges)
      .where(
        and(eq(minecraftChallenges.userId, userId), eq(minecraftChallenges.status, 'WAITING_AUTH')),
      )
      .orderBy(desc(minecraftChallenges.createdAt))
      .limit(HISTORY_LIMIT);
    const [session] = await this.db
      .select()
      .from(minecraftSessions)
      .where(and(eq(minecraftSessions.userId, userId), isNull(minecraftSessions.endedAt)));
    const events = await this.db
      .select()
      .from(minecraftEvents)
      .where(eq(minecraftEvents.actorId, userId))
      .orderBy(desc(minecraftEvents.occurredAt))
      .limit(HISTORY_LIMIT);
    const [last] = await this.db
      .select({ occurredAt: minecraftEvents.occurredAt })
      .from(minecraftEvents)
      .where(
        and(
          eq(minecraftEvents.actorId, userId),
          eq(minecraftEvents.type, 'MINECRAFT_SESSION_STARTED'),
        ),
      )
      .orderBy(desc(minecraftEvents.occurredAt))
      .limit(1);
    const now = new Date();
    return {
      accountId: userId,
      username: user.username,
      challenges: challenges.map((row) => challengeView(row, now)),
      session: session ? sessionView(session, now) : null,
      lastJoinedAt: last?.occurredAt.toISOString() ?? null,
      events: events.map((row) => ({
        id: row.id,
        type: row.type,
        occurredAt: row.occurredAt.toISOString(),
        reason: row.reason,
      })),
    };
  }
}
export { MinecraftSessions };
