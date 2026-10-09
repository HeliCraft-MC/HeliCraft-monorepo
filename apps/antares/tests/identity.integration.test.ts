// oxlint-disable max-lines-per-function -- The describe block groups independent short integration cases sharing one disposable database.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import { authSessions, users, userCredentials, userRoles } from '../src/db/schema';
import { createApp } from '../src/app';
import type { Principal } from '../src/modules/identity/contracts';
import { PrincipalSchema } from '../src/modules/identity/contracts';

const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'A sufficiently long password';
let container: StartedPostgreSqlContainer | null = null;
let database: Database | null = null;
function persistence(): Database {
  if (database === null) {
    throw new Error('Database not started');
  }
  return database;
}
function app(): ReturnType<typeof createApp> {
  return createApp({
    db: persistence().db,
    siteOrigin: ORIGIN,
    checkReady: async () => {
      await Promise.resolve();
    },
  });
}
function username(): string {
  return `u${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
}
function options(body: unknown, cookie?: string): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      ...(cookie === undefined ? {} : { Cookie: cookie }),
    },
    body: JSON.stringify(body),
  };
}
function sessionCookie(response: Response): string {
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (cookie === undefined || cookie.length === 0) {
    throw new Error('Missing session cookie');
  }
  return cookie;
}
async function registered(
  api: ReturnType<typeof app>,
): Promise<{ principal: Principal; cookie: string; name: string }> {
  const name = username();
  const response = await api.request(
    '/api/v1/auth/register',
    options({ username: name, password: PASSWORD }),
  );
  if (response.status !== 200) {
    throw new Error(`Registration failed: ${await response.text()}`);
  }
  return {
    principal: PrincipalSchema.parse(await response.json()),
    cookie: sessionCookie(response),
    name,
  };
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:18-3.6').start();
  database = createDatabase(container.getConnectionUri());
  await migrate(persistence().db, { migrationsFolder: './drizzle' });
}, 120_000);
afterAll(async () => {
  await database?.pool.end();
  await container?.stop();
});

describe('identity and account security', () => {
  it('limits repeated login attempts through the real HTTP boundary', async () => {
    const api = app();
    const name = username();
    const attempts = await Promise.all(
      Array.from(
        { length: 11 },
        async () =>
          await api.request('/api/v1/auth/login', options({ username: name, password: PASSWORD })),
      ),
    );
    expect(attempts.filter((response) => response.status === 429)).toHaveLength(1);
    expect(attempts.filter((response) => response.status === 401)).toHaveLength(10);
  });

  it('registers immutable UUID v4 and PLAYER with hashed password and opaque cookie', async () => {
    const api = app();
    const { principal, cookie } = await registered(api);
    expect(principal.id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u,
    );
    expect(principal.roles).toStrictEqual(['PLAYER']);
    const [credential] = await persistence()
      .db.select()
      .from(userCredentials)
      .where(eq(userCredentials.userId, principal.id));
    expect(credential?.passwordHash).toMatch(/^\$argon2id\$/u);
    expect(credential?.passwordHash).not.toContain(PASSWORD);
    const [session] = await persistence()
      .db.select()
      .from(authSessions)
      .where(eq(authSessions.userId, principal.id));
    expect(session?.tokenHash).not.toContain(cookie.split('=')[1]);
    const response = await api.request('/api/v1/auth/me', { headers: { Cookie: cookie } });
    expect(PrincipalSchema.parse(await response.json())).toStrictEqual(principal);
  });

  it('enforces case-insensitive uniqueness even under concurrent registration', async () => {
    const api = app();
    const name = username();
    const responses = await Promise.all([
      api.request('/api/v1/auth/register', options({ username: name, password: PASSWORD })),
      api.request(
        '/api/v1/auth/register',
        options({ username: name.toUpperCase(), password: PASSWORD }),
      ),
    ]);
    expect(new Set(responses.map((response) => response.status))).toStrictEqual(
      new Set([200, 409]),
    );
  });

  it('rejects client role escalation, weak passwords, reserved names and CSRF', async () => {
    const api = app();
    const elevated = await api.request(
      '/api/v1/auth/register',
      options({ username: username(), password: PASSWORD, roles: ['OWNER'] }),
    );
    expect(elevated.status).toBe(400);
    expect(
      (
        await api.request(
          '/api/v1/auth/register',
          options({ username: username(), password: 'short' }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await api.request(
          '/api/v1/auth/register',
          options({ username: 'Admin', password: PASSWORD }),
        )
      ).status,
    ).toBe(400);
    const missing = options({ username: username(), password: PASSWORD });
    missing.headers = { 'Content-Type': 'application/json' };
    expect((await api.request('/api/v1/auth/register', missing)).status).toBe(403);
    missing.headers = { 'Content-Type': 'application/json', Origin: 'https://attacker.test' };
    expect((await api.request('/api/v1/auth/register', missing)).status).toBe(403);
  });

  it('logs in with case-insensitive name and revokes the session server-side on logout', async () => {
    const api = app();
    const { name } = await registered(api);
    expect(
      (
        await api.request(
          '/api/v1/auth/login',
          options({ username: name, password: 'incorrect password' }),
        )
      ).status,
    ).toBe(401);
    const response = await api.request(
      '/api/v1/auth/login',
      options({ username: name.toUpperCase(), password: PASSWORD }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax');
    const cookie = sessionCookie(response);
    expect((await api.request('/api/v1/auth/logout', options({}, cookie))).status).toBe(200);
    expect((await api.request('/api/v1/auth/me', { headers: { Cookie: cookie } })).status).toBe(
      401,
    );
  });

  it('preserves UUID on rename and rejects conflicts and incorrect confirmation', async () => {
    const api = app();
    const first = await registered(api);
    const second = await registered(api);
    const conflict = options(
      { username: second.name.toUpperCase(), currentPassword: PASSWORD },
      first.cookie,
    );
    conflict.method = 'PATCH';
    expect((await api.request('/api/v1/account/username', conflict)).status).toBe(409);
    const rename = options({ username: username(), currentPassword: PASSWORD }, first.cookie);
    rename.method = 'PATCH';
    const result = await api.request('/api/v1/account/username', rename);
    expect(result.status).toBe(200);
    const principal = PrincipalSchema.parse(await result.json());
    expect(principal.id).toBe(first.principal.id);
    expect(principal.username).not.toBe(first.name);
  });

  it('changes password and revokes all sessions; old credentials no longer work', async () => {
    const api = app();
    const current = await registered(api);
    const other = await api.request(
      '/api/v1/auth/login',
      options({ username: current.name, password: PASSWORD }),
    );
    const changed = options(
      { currentPassword: PASSWORD, password: 'The new sufficiently long password' },
      current.cookie,
    );
    changed.method = 'PATCH';
    expect((await api.request('/api/v1/account/password', changed)).status).toBe(200);
    expect(
      (await api.request('/api/v1/auth/me', { headers: { Cookie: current.cookie } })).status,
    ).toBe(401);
    expect(
      (await api.request('/api/v1/auth/me', { headers: { Cookie: sessionCookie(other) } })).status,
    ).toBe(401);
    expect(
      (
        await api.request(
          '/api/v1/auth/login',
          options({ username: current.name, password: PASSWORD }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await api.request(
          '/api/v1/auth/login',
          options({ username: current.name, password: 'The new sufficiently long password' }),
        )
      ).status,
    ).toBe(200);
  });

  it('rejects expired, suspended and banned sessions and refreshes permissions from DB', async () => {
    const api = app();
    const current = await registered(api);
    await persistence()
      .db.insert(userRoles)
      .values({ userId: current.principal.id, role: 'EDITOR' });
    const request = { headers: { Cookie: current.cookie } };
    expect(
      PrincipalSchema.parse(await (await api.request('/api/v1/auth/me', request)).json()).roles,
    ).toContain('EDITOR');
    await persistence()
      .db.update(users)
      .set({ status: 'SUSPENDED' })
      .where(eq(users.id, current.principal.id));
    expect((await api.request('/api/v1/auth/me', request)).status).toBe(401);
    await persistence()
      .db.update(users)
      .set({ status: 'BANNED' })
      .where(eq(users.id, current.principal.id));
    expect((await api.request('/api/v1/auth/me', request)).status).toBe(401);
    await persistence()
      .db.update(users)
      .set({ status: 'ACTIVE' })
      .where(eq(users.id, current.principal.id));
    await persistence()
      .db.update(authSessions)
      .set({ expiresAt: new Date(0) })
      .where(eq(authSessions.userId, current.principal.id));
    expect((await api.request('/api/v1/auth/me', request)).status).toBe(401);
  });
});
