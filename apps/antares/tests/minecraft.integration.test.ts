import { monetaryFixture } from './monetary-fixture';
import { StateDraftService } from '../src/modules/states/drafts';
import { StateService } from '../src/modules/states/service';
import { applyPreset } from '../src/modules/states/presets';
import { leaveState } from '../src/modules/states/citizenship';
// oxlint-disable import/max-dependencies, max-lines -- Independent contract/security cases share one real disposable PostgreSQL fixture.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import { createApp } from '../src/app';
import { PrincipalSchema } from '../src/modules/identity/contracts';
import {
  AccountMinecraft,
  IssuedChallenge,
  Admission,
  Profile,
} from '../src/modules/minecraft/contracts';
import {
  minecraftChallenges,
  minecraftSessions,
  minecraftEvents,
} from '../src/db/minecraft-schema';
import { users, authSessions } from '../src/db/schema';
import { expireMinecraft } from '../src/modules/minecraft/lifecycle';
import type { GeoLookup } from '../src/modules/minecraft/connection';

const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'Minecraft test account password';
const RIGEL = {
  id: 'rigel-test',
  role: 'RIGEL',
  backendId: 'deneb',
  token: 'r'.repeat(43),
} as const;
const DENEB = {
  id: 'deneb-test',
  role: 'DENEB',
  backendId: 'deneb',
  token: 'd'.repeat(43),
} as const;
let container: StartedPostgreSqlContainer | null = null;
let database: Database | null = null;
function persistence(): Database {
  if (!database) {
    throw new Error('No test database');
  }
  return database;
}
function api(geoLookup?: GeoLookup): ReturnType<typeof createApp> {
  return createApp({
    db: persistence().db,
    geoLookup,
    siteOrigin: ORIGIN,
    minecraftActors: [
      RIGEL,
      DENEB,
      { ...RIGEL, id: 'other-proxy', token: 'o'.repeat(43) },
      { ...DENEB, id: 'other-paper', backendId: 'other', token: 'b'.repeat(43) },
    ],
    checkReady: async () => {
      await Promise.resolve();
    },
  });
}
function post(body: unknown, token?: string, cookie?: string): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token === undefined ? { Origin: ORIGIN } : { Authorization: `Bearer ${token}` }),
      ...(cookie === undefined ? {} : { Cookie: cookie }),
    },
    body: JSON.stringify(body),
  };
}
async function fixture(): Promise<{
  app: ReturnType<typeof api>;
  id: string;
  name: string;
  cookie: string;
}> {
  const app = api();
  const name = `m${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const response = await app.request(
    '/api/v1/auth/register',
    post({ username: name, password: PASSWORD }),
  );
  const user = PrincipalSchema.parse(await response.json());
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (cookie === undefined || cookie.length === 0) {
    throw new Error('No cookie');
  }
  return { app, id: user.id, name, cookie };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function challenge(current: Fixture): Promise<{
  issued: ReturnType<typeof IssuedChallenge.parse>;
  proof: { verifier: string; connectionId: string };
}> {
  const connectionId = crypto.randomUUID();
  const response = await current.app.request(
    '/api/v1/internal/minecraft/challenges',
    post({ username: current.name.toUpperCase(), connectionId }, RIGEL.token),
  );
  expect(response.status).toBe(200);
  const issued = IssuedChallenge.parse(await response.json());
  return { issued, proof: { verifier: issued.verifier, connectionId } };
}
// oxlint-disable-next-line max-params -- Test helper passes an explicit owning fixture, challenge, code and decision.
async function decision(
  current: Fixture,
  issued: ReturnType<typeof IssuedChallenge.parse>,
  code = issued.code,
  action = 'APPROVE',
): Promise<Response> {
  return await current.app.request(
    `/api/v1/account/minecraft/challenges/${issued.id}/decision`,
    post({ code, decision: action }, undefined, current.cookie),
  );
}
async function consume(
  current: Fixture,
  pending: Awaited<ReturnType<typeof challenge>>,
): Promise<Response> {
  return await current.app.request(
    `/api/v1/internal/minecraft/challenges/${pending.issued.id}/consume`,
    post(pending.proof, RIGEL.token),
  );
}
async function admitted(current: Fixture): Promise<ReturnType<typeof Admission.parse>> {
  const pending = await challenge(current);
  expect((await decision(current, pending.issued)).status).toBe(200);
  const response = await consume(current, pending);
  const result: unknown = await response.json();
  return Admission.parse(
    typeof result === 'object' && result !== null && 'admission' in result
      ? result.admission
      : undefined,
  );
}
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
    .withDatabase('helicraft_minecraft_test')
    .start();
  database = createDatabase(container.getConnectionUri());
  await migrate(persistence().db, { migrationsFolder: './drizzle' });
}, 120_000);
afterAll(async () => {
  await database?.pool.end();
  await container?.stop();
});

describe('Minecraft service authentication and identity', () => {
  it('requires scoped credentials, rejects cookies and cannot bypass CSRF on browser routes', async () => {
    const current = await fixture();
    const body = { username: current.name, connectionId: crypto.randomUUID() };
    expect(
      (await current.app.request('/api/v1/internal/minecraft/challenges', post(body))).status,
    ).toBe(401);
    expect(
      (await current.app.request('/api/v1/internal/minecraft/challenges', post(body, 'wrong')))
        .status,
    ).toBe(401);
    expect(
      (await current.app.request('/api/v1/internal/minecraft/challenges', post(body, DENEB.token)))
        .status,
    ).toBe(403);
    expect(
      (
        await current.app.request(
          '/api/v1/internal/minecraft/challenges',
          post(body, RIGEL.token, current.cookie),
        )
      ).status,
    ).toBe(401);
    expect((await current.app.request('/api/v1/auth/logout', post({}, RIGEL.token))).status).toBe(
      403,
    );
  });
  it('does not register unknown names, accept Unicode or client-selected UUIDs', async () => {
    const current = await fixture();
    const path = '/api/v1/internal/minecraft/challenges';
    expect(
      (
        await current.app.request(
          path,
          post({ username: 'UnknownUser', connectionId: crypto.randomUUID() }, RIGEL.token),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await current.app.request(
          path,
          post({ username: 'Рlayer', connectionId: crypto.randomUUID() }, RIGEL.token),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await current.app.request(
          path,
          post(
            {
              username: current.name,
              connectionId: crypto.randomUUID(),
              accountId: crypto.randomUUID(),
            },
            RIGEL.token,
          ),
        )
      ).status,
    ).toBe(400);
  });
  it('uses immutable account UUID and canonical name without treating lookup as authentication', async () => {
    const current = await fixture();
    const { issued } = await challenge(current);
    expect(issued.accountId).toBe(current.id);
    expect(issued.username).toBe(current.name);
    const response = await current.app.request(
      '/api/v1/internal/minecraft/paper/admission',
      post({ accountId: current.id, username: current.name }, DENEB.token),
    );
    expect(response.status).toBe(403);
    const [row] = await persistence()
      .db.select()
      .from(minecraftChallenges)
      .where(eq(minecraftChallenges.id, issued.id));
    expect(row?.codeHash).not.toContain(issued.code);
    expect(row?.verifierHash).not.toContain(issued.verifier);
  });
});
describe('Minecraft sign-in link and private metadata', () => {
  it('issues a fragment-only link with private connection details and still requires explicit owner approval', async () => {
    const original = await fixture();
    const current = {
      ...original,
      app: api(() => ({
        countryCode: 'US',
        city: { en: 'Test city' },
        timeZone: 'America/New_York',
      })),
    };
    const other = await fixture();
    const connectionId = crypto.randomUUID();
    const client = { address: '8.8.8.8', port: 54_321, protocol: 777, version: '26.3' };
    const issuedResponse = await current.app.request(
      '/api/v1/internal/minecraft/challenges',
      post({ username: current.name, connectionId, client }, RIGEL.token),
    );
    expect(issuedResponse.status).toBe(200);
    const issued = IssuedChallenge.parse(await issuedResponse.json());
    const link = new URL(issued.confirmationUrl);
    expect(link.origin).toBe(ORIGIN);
    expect(link.pathname).toBe('/app/minecraft');
    expect(link.search).toBe('');
    const fragment = new URLSearchParams(link.hash.slice(1));
    expect(fragment.get('challenge')).toBe(issued.id);
    expect(fragment.get('code')).toBe(issued.code);
    const accountResponse = await current.app.request('/api/v1/account/minecraft', {
      headers: { Cookie: current.cookie },
    });
    expect(accountResponse.headers.get('cache-control')).toBe('no-store');
    const account = AccountMinecraft.parse(await accountResponse.json());
    expect(account.challenges[0]?.connection).toMatchObject({
      ...client,
      addressKind: 'PUBLIC',
      location: { countryCode: 'US', city: { en: 'Test city' } },
    });
    expect(JSON.stringify(account)).not.toContain(issued.code);
    const foreign = await current.app.request('/api/v1/account/minecraft', {
      headers: { Cookie: other.cookie },
    });
    expect(AccountMinecraft.parse(await foreign.json()).challenges).toStrictEqual([]);
    const pending = { issued, proof: { connectionId, verifier: issued.verifier } };
    expect((await consume(current, pending)).status).toBe(403);
    expect((await decision({ ...current, cookie: other.cookie }, issued)).status).toBe(403);
    expect(
      (
        await current.app.request(
          `/api/v1/account/minecraft/challenges/${issued.id}/decision`,
          post({ decision: 'APPROVE' }, undefined, current.cookie),
        )
      ).status,
    ).toBe(403);
    expect((await decision(current, issued, fragment.get('code') ?? '')).status).toBe(200);
    expect((await consume(current, pending)).status).toBe(200);
    expect((await decision(current, issued)).status).toBe(403);
  });
  it('validates proxy connection metadata and rejects client-supplied geolocation', async () => {
    const current = await fixture();
    const base = { username: current.name, connectionId: crypto.randomUUID() };
    const clients = [
      { address: 'not-an-ip', port: 1, protocol: 777, version: '26.3' },
      { address: '127.0.0.1', port: 65_536, protocol: 777, version: '26.3' },
      {
        address: '127.0.0.1',
        port: 1,
        protocol: 777,
        version: '26.3',
        location: { countryCode: 'US' },
      },
    ];
    await Promise.all(
      clients.map(async (client) => {
        expect(
          (
            await current.app.request(
              '/api/v1/internal/minecraft/challenges',
              post({ ...base, client }, RIGEL.token),
            )
          ).status,
        ).toBe(400);
      }),
    );
  });
});
describe('Minecraft browser possession proof and single use', () => {
  it('hides other accounts challenges and requires correct code, owner cookie and Origin', async () => {
    const current = await fixture();
    const other = await fixture();
    const pending = await challenge(current);
    const foreign = await current.app.request('/api/v1/account/minecraft', {
      headers: { Cookie: other.cookie },
    });
    expect(AccountMinecraft.parse(await foreign.json()).challenges).toStrictEqual([]);
    expect((await decision({ ...current, cookie: other.cookie }, pending.issued)).status).toBe(403);
    expect((await decision(current, pending.issued, '0'.repeat(16))).status).toBe(403);
    const crossSite = post(
      { code: pending.issued.code, decision: 'APPROVE' },
      undefined,
      current.cookie,
    );
    crossSite.headers = {
      'Content-Type': 'application/json',
      Cookie: current.cookie,
      Origin: 'https://attacker.test',
    };
    expect(
      (
        await current.app.request(
          `/api/v1/account/minecraft/challenges/${pending.issued.id}/decision`,
          crossSite,
        )
      ).status,
    ).toBe(403);
    expect((await consume(current, pending)).status).toBe(403);
    expect((await decision(current, pending.issued)).status).toBe(200);
    expect(
      (
        await consume(current, {
          ...pending,
          proof: { ...pending.proof, connectionId: crypto.randomUUID() },
        })
      ).status,
    ).toBe(403);
    const attempts = await Promise.all([consume(current, pending), consume(current, pending)]);
    expect(new Set(attempts.map((response) => response.status))).toStrictEqual(new Set([200, 403]));
    expect((await decision(current, pending.issued)).status).toBe(403);
  });
  it('bounds parallel connections, code attempts, rejection and cancelled challenges', async () => {
    const current = await fixture();
    const pending = await challenge(current);
    expect(
      (
        await current.app.request(
          '/api/v1/internal/minecraft/challenges',
          post({ username: current.name, connectionId: crypto.randomUUID() }, RIGEL.token),
        )
      ).status,
    ).toBe(409);
    const attempts = await Promise.all(
      Array.from(
        { length: 5 },
        async () => await decision(current, pending.issued, '0'.repeat(16)),
      ),
    );
    expect(attempts.every((response) => response.status === 403)).toBe(true);
    expect((await decision(current, pending.issued)).status).toBe(403);
    const next = await challenge(current);
    expect((await decision(current, next.issued, next.issued.code, 'REJECT')).status).toBe(200);
    expect((await consume(current, next)).status).toBe(403);
    const last = await challenge(current);
    expect(
      (
        await current.app.request(
          `/api/v1/internal/minecraft/challenges/${last.issued.id}/cancel`,
          post(last.proof, RIGEL.token),
        )
      ).status,
    ).toBe(200);
    expect((await decision(current, last.issued)).status).toBe(403);
  });
  it('rejects expired challenges, revoked approval sessions and blocked accounts', async () => {
    const current = await fixture();
    const pending = await challenge(current);
    await persistence()
      .db.update(minecraftChallenges)
      .set({ expiresAt: new Date(Date.now() - 1), createdAt: new Date(Date.now() - 200_000) })
      .where(eq(minecraftChallenges.id, pending.issued.id));
    expect((await decision(current, pending.issued)).status).toBe(403);
    await expireMinecraft(persistence().db);
    const next = await challenge(current);
    expect((await decision(current, next.issued)).status).toBe(200);
    await persistence()
      .db.update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.userId, current.id));
    expect((await consume(current, next)).status).toBe(403);
    await persistence().db.update(users).set({ status: 'BANNED' }).where(eq(users.id, current.id));
    expect((await consume(current, next)).status).toBe(403);
  });
});
describe('Minecraft account change invalidation', () => {
  it('invalidates approved challenges on rename and retains the UUID for the new canonical name', async () => {
    const current = await fixture();
    const pending = await challenge(current);
    expect((await decision(current, pending.issued)).status).toBe(200);
    const renamed = `${current.name}n`;
    const request = post(
      { username: renamed, currentPassword: PASSWORD },
      undefined,
      current.cookie,
    );
    request.method = 'PATCH';
    const response = await current.app.request('/api/v1/account/username', request);
    expect(response.status).toBe(200);
    expect(PrincipalSchema.parse(await response.json()).id).toBe(current.id);
    expect((await consume(current, pending)).status).toBe(403);
    const next = await challenge({ ...current, name: renamed });
    expect(next.issued.accountId).toBe(current.id);
    expect(next.issued.username).toBe(renamed);
    expect(
      (
        await current.app.request(
          `/api/v1/account/minecraft/challenges/${next.issued.id}/decision`,
          post({ decision: 'REJECT' }, undefined, current.cookie),
        )
      ).status,
    ).toBe(200);
  });
  it('rejects expired web approval and lost proxy polling even before challenge TTL', async () => {
    const current = await fixture();
    const pending = await challenge(current);
    expect((await decision(current, pending.issued)).status).toBe(200);
    await persistence()
      .db.update(authSessions)
      .set({ expiresAt: new Date(0) })
      .where(eq(authSessions.userId, current.id));
    expect((await consume(current, pending)).status).toBe(403);
    const other = await fixture();
    const waiting = await challenge(other);
    await persistence()
      .db.update(minecraftChallenges)
      .set({ polledAt: new Date(0) })
      .where(eq(minecraftChallenges.id, waiting.issued.id));
    expect((await decision(other, waiting.issued)).status).toBe(403);
  });
});
// oxlint-disable-next-line max-lines-per-function -- Independent admission, membership and immutable-presence scenarios share the same disposable database.
describe('Minecraft Paper presence and private immutable events', () => {
  it('binds challenge proof to its service actor and admission to its configured backend', async () => {
    const current = await fixture();
    const pending = await challenge(current);
    expect(
      (
        await current.app.request(
          `/api/v1/internal/minecraft/challenges/${pending.issued.id}/status`,
          post(pending.proof, 'o'.repeat(43)),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await current.app.request(
          `/api/v1/internal/minecraft/challenges/${pending.issued.id}/status`,
          post({ ...pending.proof, verifier: 'x'.repeat(43) }, RIGEL.token),
        )
      ).status,
    ).toBe(403);
    const decisions = await Promise.all([
      decision(current, pending.issued),
      decision(current, pending.issued),
    ]);
    expect(new Set(decisions.map((response) => response.status))).toStrictEqual(
      new Set([200, 403]),
    );
    expect((await consume(current, pending)).status).toBe(200);
    expect(
      (
        await current.app.request(
          '/api/v1/internal/minecraft/paper/admission',
          post({ accountId: current.id, username: current.name }, 'b'.repeat(43)),
        )
      ).status,
    ).toBe(403);
  });

  it('returns all current localized citizenships and excludes a departed historical cofounder', async () => {
    const data = await monetaryFixture(persistence().db, 'Mc');
    const app = api();
    const name = 'MoneyCitizenMc';
    const login = await app.request(
      '/api/v1/auth/login',
      post({ username: name, password: 'A sufficiently long password' }),
    );
    const cookie = login.headers.get('set-cookie')?.split(';')[0];
    if (cookie === undefined || cookie.length === 0) {
      throw new Error('No fixture cookie');
    }
    const current = { app, id: data.citizenId, name, cookie };
    const drafts = new StateDraftService(persistence().db);
    const draft = await drafts.create(data.founderId, 'Second citizenship');
    const saved = await drafts.save(draft.id, data.founderId, {
      version: draft.version,
      title: draft.title,
      step: 1,
      configuration: {
        ...draft.configuration,
        name: { ru: 'Второе государство' },
        slug: 'minecraft-second',
        cofounderIds: [data.citizenId],
        governance: applyPreset('AUTOCRACY', data.founderId),
      },
    });
    const states = new StateService(persistence().db);
    const secondId = await states.submit(draft.id, data.founderId, saved.version);
    await states.changeStatus(secondId, data.adminId, {
      status: 'ACTIVE',
      reason: 'Minecraft membership fixture',
    });
    await admitted(current);
    const request = async (locale: 'ru' | 'en'): Promise<ReturnType<typeof Profile.parse>> => {
      const response = await app.request(
        '/api/v1/internal/minecraft/paper/profile',
        post({ accountId: current.id, username: name, locale }, DENEB.token),
      );
      expect(response.status).toBe(200);
      return Profile.parse(await response.json());
    };
    expect(new Set((await request('ru')).states)).toStrictEqual(
      new Set(['Денежное государство', 'Второе государство']),
    );
    expect(new Set((await request('en')).states)).toStrictEqual(
      new Set(['Money state', 'Второе государство']),
    );
    await leaveState(persistence().db, data.stateId, data.citizenId);
    expect((await request('en')).states).toStrictEqual(['Второе государство']);
    await leaveState(persistence().db, secondId, data.citizenId);
    expect((await request('en')).states).toStrictEqual([]);
  });

  it('binds the approved website language to the exact game session without changing identity checks', async () => {
    const current = await fixture();
    const pending = await challenge(current);
    const route = `/api/v1/account/minecraft/challenges/${pending.issued.id}/decision`;
    expect(
      (
        await current.app.request(
          route,
          post(
            { decision: 'APPROVE', code: pending.issued.code, locale: 'xx' },
            undefined,
            current.cookie,
          ),
        )
      ).status,
    ).toBe(400);
    const wrongCode = `${pending.issued.code.startsWith('0') ? '1' : '0'}${pending.issued.code.slice(1)}`;
    expect(
      (
        await current.app.request(
          route,
          post({ decision: 'APPROVE', code: wrongCode, locale: 'ru' }, undefined, current.cookie),
        )
      ).status,
    ).toBe(403);
    const [unapproved] = await persistence()
      .db.select({ locale: minecraftChallenges.locale })
      .from(minecraftChallenges)
      .where(eq(minecraftChallenges.id, pending.issued.id));
    expect(unapproved?.locale).toBeNull();
    expect(
      (
        await current.app.request(
          route,
          post(
            { decision: 'APPROVE', code: pending.issued.code, locale: 'ru' },
            undefined,
            current.cookie,
          ),
        )
      ).status,
    ).toBe(200);
    expect((await consume(current, pending)).status).toBe(200);
    const response = await current.app.request(
      '/api/v1/internal/minecraft/paper/profile',
      post({ accountId: current.id, username: current.name, locale: 'en' }, DENEB.token),
    );
    expect(response.status).toBe(200);
    expect(Profile.parse(await response.json())).toMatchObject({
      accountId: current.id,
      username: current.name,
      locale: 'ru',
    });
  });

  it('requires actual Paper join, matches UUID/name, closes idempotently and never exposes secrets', async () => {
    const current = await fixture();
    const admission = await admitted(current);
    expect(admission.session.accountId).toBe(current.id);
    expect(admission.session.online).toBe(false);
    expect(
      (
        await current.app.request(
          '/api/v1/internal/minecraft/paper/admission',
          post({ accountId: crypto.randomUUID(), username: current.name }, DENEB.token),
        )
      ).status,
    ).toBe(403);
    const join = async (): Promise<Response> =>
      await current.app.request(
        '/api/v1/internal/minecraft/deneb/join',
        post({ sessionId: admission.session.id }, DENEB.token),
      );
    expect((await join()).status).toBe(200);
    expect((await join()).status).toBe(200);
    const account = await current.app.request('/api/v1/account/minecraft', {
      headers: { Cookie: current.cookie },
    });
    const data = AccountMinecraft.parse(await account.json());
    expect(data.session?.online).toBe(true);
    expect(data.events).toHaveLength(1);
    expect(JSON.stringify(data)).not.toMatch(/verifier|codeHash|password|tokenHash|proxyId/u);
    const close = async (): Promise<Response> =>
      await current.app.request(
        '/api/v1/internal/minecraft/rigel/close',
        post({ sessionId: admission.session.id }, RIGEL.token),
      );
    expect((await close()).status).toBe(200);
    expect((await close()).status).toBe(200);
    const events = await persistence()
      .db.select()
      .from(minecraftEvents)
      .where(eq(minecraftEvents.actorId, current.id));
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.visibility === 'PRIVATE')).toBe(true);
    await expect(
      persistence().db.execute(
        sql`update minecraft_events set reason = 'rewrite' where actor_id = ${current.id}`,
      ),
    ).rejects.toThrow();
  });
  it('expires crashed Paper even while proxy heartbeat continues', async () => {
    const current = await fixture();
    const admission = await admitted(current);
    await current.app.request(
      '/api/v1/internal/minecraft/deneb/join',
      post({ sessionId: admission.session.id }, DENEB.token),
    );
    await persistence()
      .db.update(minecraftSessions)
      .set({ paperExpiresAt: new Date(0) })
      .where(eq(minecraftSessions.id, admission.session.id));
    expect(
      (
        await current.app.request(
          '/api/v1/internal/minecraft/rigel/heartbeat',
          post({ sessionId: admission.session.id }, RIGEL.token),
        )
      ).status,
    ).toBe(403);
    await expireMinecraft(persistence().db);
    const account = await current.app.request('/api/v1/account/minecraft', {
      headers: { Cookie: current.cookie },
    });
    expect(AccountMinecraft.parse(await account.json()).session).toBeNull();
  });
  it('revokes Minecraft on password change without changing UUID', async () => {
    const current = await fixture();
    const admission = await admitted(current);
    const change = post(
      { currentPassword: PASSWORD, password: 'The new Minecraft account password' },
      undefined,
      current.cookie,
    );
    change.method = 'PATCH';
    expect((await current.app.request('/api/v1/account/password', change)).status).toBe(200);
    const [session] = await persistence()
      .db.select()
      .from(minecraftSessions)
      .where(eq(minecraftSessions.id, admission.session.id));
    expect(session?.endedAt).not.toBeNull();
    const [user] = await persistence().db.select().from(users).where(eq(users.id, current.id));
    expect(user?.id).toBe(current.id);
  });
});
