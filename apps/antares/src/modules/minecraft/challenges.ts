// oxlint-disable max-lines-per-function -- Account locking, possession proof and one-time transitions must remain in the same atomic transactions.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, isNull, or } from 'drizzle-orm';
import type { Database } from '../../db';
import { users } from '../../db/schema';
import { minecraftChallenges, minecraftSessions } from '../../db/minecraft-schema';
import { DomainError, HTTP } from '../errors';
import { tokenHash } from '../sessions/service';
import type { Authenticated } from '../sessions/service';
import type { ServiceActor, ChallengeDecision } from './contracts';
import { CHALLENGE_MS, MAX_ATTEMPTS, expireMinecraft } from './lifecycle';
import {
  activeAccount,
  activeWebSession,
  audit,
  challengeView,
  lease,
  sessionView,
  unavailable,
} from './store';

const CODE_BYTES = 8;
const VERIFIER_BYTES = 32;
interface ChallengeProof {
  readonly connectionId: string;
  readonly verifier: string;
}
class MinecraftChallenges {
  private readonly db: Database['db'];
  private readonly siteOrigin: string;
  public constructor(db: Database['db'], siteOrigin: string) {
    this.db = db;
    this.siteOrigin = siteOrigin;
  }
  public async create(
    input: { readonly username: string; readonly connectionId: string },
    actor: ServiceActor,
  ): Promise<{
    id: string;
    accountId: string;
    username: string;
    createdAt: string;
    expiresAt: string;
    status: 'WAITING_AUTH';
    verifier: string;
    code: string;
    confirmationUrl: string;
    serverName: string;
  }> {
    await expireMinecraft(this.db);
    return await this.db.transaction(async (transaction) => {
      const [lookup] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.usernameNormalized, input.username.toLowerCase()));
      if (!lookup) {
        throw new DomainError(
          HTTP.notFound,
          'MINECRAFT_ACCOUNT_NOT_FOUND',
          'Register an account on the website first',
        );
      }
      const user = await activeAccount(transaction, lookup.id);
      const pending = await transaction
        .select({ id: minecraftChallenges.id })
        .from(minecraftChallenges)
        .where(
          and(
            eq(minecraftChallenges.userId, user.id),
            or(
              eq(minecraftChallenges.status, 'WAITING_AUTH'),
              eq(minecraftChallenges.status, 'APPROVED'),
            ),
          ),
        );
      const active = await transaction
        .select({ id: minecraftSessions.id })
        .from(minecraftSessions)
        .where(and(eq(minecraftSessions.userId, user.id), isNull(minecraftSessions.endedAt)));
      if (pending.length > 0 || active.length > 0) {
        throw new DomainError(
          HTTP.conflict,
          'MINECRAFT_ALREADY_CONNECTING',
          'Another Minecraft connection is active; disconnect it or wait for expiry',
        );
      }
      const now = new Date();
      const verifier = randomBytes(VERIFIER_BYTES).toString('base64url');
      const code = randomBytes(CODE_BYTES).toString('hex').toUpperCase();
      const [row] = await transaction
        .insert(minecraftChallenges)
        .values({
          userId: user.id,
          username: user.username,
          proxyId: actor.id,
          connectionId: input.connectionId,
          verifierHash: tokenHash(verifier),
          codeHash: tokenHash(code),
          createdAt: now,
          expiresAt: new Date(now.getTime() + CHALLENGE_MS),
        })
        .returning();
      if (!row) {
        throw unavailable();
      }
      await audit(transaction, user.id, row.id, 'challenge.created', actor.id);
      return {
        ...challengeView(row, now),
        status: 'WAITING_AUTH',
        accountId: user.id,
        verifier,
        code,
        confirmationUrl: `${this.siteOrigin}/app/minecraft`,
        serverName: '',
      };
    });
  }
  // oxlint-disable-next-line max-params -- Connection proof, operation and service scope are explicit at this internal boundary.
  public async proof(
    id: string,
    proof: ChallengeProof,
    actor: ServiceActor,
    operation: 'STATUS' | 'CONSUME' | 'CANCEL',
  ): Promise<{
    challenge: ReturnType<typeof challengeView>;
    admission: { session: ReturnType<typeof sessionView>; backendId: string } | null;
  }> {
    // oxlint-disable-next-line max-statements -- Proof verification and consumption share an account lock and one commit.
    return await this.db.transaction(async (transaction) => {
      const [lookup] = await transaction
        .select({ userId: minecraftChallenges.userId })
        .from(minecraftChallenges)
        .where(eq(minecraftChallenges.id, id));
      if (!lookup) {
        throw unavailable();
      }
      const user = await activeAccount(transaction, lookup.userId);
      const [row] = await transaction
        .select()
        .from(minecraftChallenges)
        .where(eq(minecraftChallenges.id, id))
        .for('update');
      if (
        !row ||
        row.proxyId !== actor.id ||
        row.connectionId !== proof.connectionId ||
        !timingSafeEqual(Buffer.from(row.verifierHash), Buffer.from(tokenHash(proof.verifier))) ||
        row.username !== user.username
      ) {
        throw unavailable();
      }
      const now = new Date();
      const view = challengeView(row, now);
      if (operation === 'CANCEL') {
        if (row.status === 'WAITING_AUTH' || row.status === 'APPROVED') {
          await transaction
            .update(minecraftChallenges)
            .set({ status: 'DISCONNECTED' })
            .where(eq(minecraftChallenges.id, id));
        }
        return { challenge: { ...view, status: 'DISCONNECTED' }, admission: null };
      }
      if (operation === 'CONSUME') {
        if (view.status !== 'APPROVED' || row.approvedSessionId === null) {
          throw unavailable();
        }
        await activeWebSession(transaction, row.approvedSessionId, user.id, now);
        await transaction
          .update(minecraftChallenges)
          .set({ status: 'CONSUMED' })
          .where(eq(minecraftChallenges.id, id));
        const [session] = await transaction
          .insert(minecraftSessions)
          .values({
            challengeId: id,
            userId: user.id,
            username: user.username,
            proxyId: actor.id,
            backendId: actor.backendId,
            connectionId: row.connectionId,
            approvedSessionId: row.approvedSessionId,
            proxyExpiresAt: lease(),
            paperExpiresAt: lease(),
          })
          .returning();
        if (!session) {
          throw unavailable();
        }
        await audit(transaction, user.id, id, 'challenge.consumed', actor.id);
        return {
          challenge: { ...view, status: 'CONSUMED' },
          admission: { session: sessionView(session, now), backendId: actor.backendId },
        };
      }
      if (view.status === 'WAITING_AUTH' || view.status === 'APPROVED') {
        await transaction
          .update(minecraftChallenges)
          .set({ polledAt: now })
          .where(eq(minecraftChallenges.id, id));
      }
      return { challenge: view, admission: null };
    });
  }
  public async decide(
    id: string,
    input: Readonly<ChallengeDecision>,
    current: Authenticated,
  ): Promise<ReturnType<typeof challengeView>> {
    const result = await this.db.transaction(async (transaction) => {
      await activeAccount(transaction, current.principal.id);
      const now = new Date();
      await activeWebSession(transaction, current.sessionId, current.principal.id, now);
      const [row] = await transaction
        .select()
        .from(minecraftChallenges)
        .where(
          and(eq(minecraftChallenges.id, id), eq(minecraftChallenges.userId, current.principal.id)),
        )
        .for('update');
      if (!row || challengeView(row, now).status !== 'WAITING_AUTH') {
        throw unavailable();
      }
      if (
        input.decision === 'APPROVE' &&
        !timingSafeEqual(
          Buffer.from(row.codeHash),
          Buffer.from(tokenHash(input.code?.toUpperCase() ?? '')),
        )
      ) {
        const attempts = row.attempts + 1;
        await transaction
          .update(minecraftChallenges)
          .set({ attempts, status: attempts >= MAX_ATTEMPTS ? 'REJECTED' : 'WAITING_AUTH' })
          .where(eq(minecraftChallenges.id, id));
        await audit(transaction, row.userId, id, 'challenge.code_rejected', 'vega');
        return null;
      }
      const status: 'APPROVED' | 'REJECTED' =
        input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      await transaction
        .update(minecraftChallenges)
        .set({
          status,
          approvedSessionId: current.sessionId,
          locale: input.decision === 'APPROVE' ? (input.locale ?? null) : null,
        })
        .where(eq(minecraftChallenges.id, id));
      await audit(transaction, row.userId, id, `challenge.${status.toLowerCase()}`, 'vega');
      return { ...challengeView(row, now), status };
    });
    if (result === null) {
      throw new DomainError(
        HTTP.forbidden,
        'MINECRAFT_CODE_REJECTED',
        'The code does not match the Minecraft connection',
      );
    }
    return result;
  }
}
export { MinecraftChallenges };
