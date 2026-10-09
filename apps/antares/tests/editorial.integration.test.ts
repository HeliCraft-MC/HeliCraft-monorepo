// oxlint-disable import/max-dependencies -- Integration exercises real persistence, storage and domain boundaries together.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import { users, userRoles, adminAuditLog } from '../src/db/schema';
import { IdentityService } from '../src/modules/identity/service';
import { SessionService } from '../src/modules/sessions/service';
import type { Principal } from '../src/modules/identity/contracts';
import type { Role } from '../src/modules/permissions/policy';
import { ContentService } from '../src/modules/content/service';
import { ContentInputSchema } from '../src/modules/content/contracts';
import { AdministrationService } from '../src/modules/administration/service';
import { createApp } from '../src/app';

let container: StartedPostgreSqlContainer | null = null;
let database: Database | null = null;
function persistence(): Database {
  if (database === null) {
    throw new Error('Test persistence not initialized');
  }
  return database;
}
async function account(role: Role): Promise<{ principal: Principal; token: string }> {
  const { db } = persistence();
  const name = `u${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const token = await new IdentityService(db).register(name, 'A long editorial test password');
  const sessions = new SessionService(db);
  const first = await sessions.authenticate(token);
  if (role !== 'PLAYER') {
    await db.insert(userRoles).values({ userId: first.principal.id, role });
  }
  return { principal: (await sessions.authenticate(token)).principal, token };
}
function document(
  slug: string,
  markdown = '# Заголовок\n\n**Текст**\n\n<script>alert(1)</script>',
): ReturnType<typeof ContentInputSchema.parse> {
  return ContentInputSchema.parse({
    slug,
    title: 'Новая история',
    description: 'Редакционная публикация',
    markdown,
  });
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

// oxlint-disable-next-line max-lines-per-function -- One suite groups independently bounded persistence cases using shared disposable fixtures.
describe('editorial persistence and authorization', () => {
  it('keeps drafts private, sanitizes publications, redirects old slugs and restores as a new revision', async () => {
    const { principal } = await account('EDITOR');
    const service = new ContentService(persistence().db);
    const slug = `story-${crypto.randomUUID()}`;
    const draft = await service.create('CHRONICLE', document(slug), principal);
    await expect(service.publicDocument('CHRONICLE', slug)).rejects.toThrow('не найдена');
    await service.publish(draft.id, true, principal);
    const published = await service.publicDocument('CHRONICLE', slug);
    expect(published.document.html).toContain('<strong>Текст</strong>');
    expect(published.document.html).not.toContain('<script>');
    await service.save(draft.id, document(`${slug}-changed`, 'Новая редакция'), principal);
    const redirect = await service.publicDocument('CHRONICLE', slug);
    expect(redirect.redirect).toBe(true);
    expect(redirect.document.slug).toBe(`${slug}-changed`);
    await expect(service.create('CHRONICLE', document(slug), principal)).rejects.toThrow('адрес');
    const restored = await service.restore(draft.id, 1, principal);
    expect(restored.revision).toBe(3);
    expect(restored.slug).toBe(slug);
    expect(await service.revisions(draft.id, principal)).toHaveLength(3);
    await service.publish(draft.id, false, principal);
    await expect(service.publicDocument('CHRONICLE', slug)).rejects.toThrow('не найдена');
  });

  it('replaces a featured publication atomically with revision and audit evidence', async () => {
    const { principal } = await account('EDITOR');
    const service = new ContentService(persistence().db);
    const first = await service.create(
      'CHRONICLE',
      { ...document(`featured-${crypto.randomUUID()}`), isFeatured: true },
      principal,
    );
    const second = await service.create(
      'CHRONICLE',
      { ...document(`featured-${crypto.randomUUID()}`), isFeatured: true },
      principal,
    );
    await service.publish(first.id, true, principal);
    await service.publish(second.id, true, principal);
    const displaced = await service.adminDocument(first.id, principal);
    expect(displaced.isFeatured).toBe(false);
    expect(displaced.revision).toBe(2);
    expect(await service.revisions(first.id, principal)).toHaveLength(2);
    const publicList = await service.publicList('CHRONICLE', 1, 50);
    expect(publicList.items.filter((entry) => entry.isFeatured).map((entry) => entry.id)).toEqual([
      second.id,
    ]);
  });

  it('keeps built-in CMS pages at one canonical sitemap location', async () => {
    const { principal } = await account('EDITOR');
    const service = new ContentService(persistence().db);
    const page = await service.create('PAGE', document('rules'), principal);
    await service.publish(page.id, true, principal);
    const api = createApp({
      db: persistence().db,
      checkReady: async () => {
        await Promise.resolve();
      },
    });
    const response = await api.request('/api/v1/public/sitemap.xml');
    expect(response.status).toBe(200);
    const xml = await response.text();
    expect(xml).toContain('http://localhost:5173/rules');
    expect(xml).not.toContain('/pages/rules');
  });

  it('denies PLAYER CMS access and EDITOR user administration through the actual API', async () => {
    const player = await account('PLAYER');
    const editor = await account('EDITOR');
    const api = createApp({
      db: persistence().db,
      checkReady: async () => {
        await Promise.resolve();
      },
    });
    const playerResponse = await api.request('/api/v1/admin/pages', {
      headers: { Cookie: `helicraft_session=${player.token}` },
    });
    const editorResponse = await api.request('/api/v1/admin/users', {
      headers: { Cookie: `helicraft_session=${editor.token}` },
    });
    expect(playerResponse.status).toBe(403);
    expect(editorResponse.status).toBe(403);
    const success = await api.request('/api/v1/admin/chronicle', {
      headers: { Cookie: `helicraft_session=${editor.token}` },
    });
    expect(success.status).toBe(200);
  });

  it('protects the final active OWNER under concurrent role and status mutations', async () => {
    const first = await account('OWNER');
    const second = await account('OWNER');
    const service = new AdministrationService(persistence().db);
    const results = await Promise.allSettled([
      service.roles(first.principal.id, ['PLAYER'], first.principal),
      service.roles(second.principal.id, ['PLAYER'], second.principal),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const owners = await persistence()
      .db.select({ id: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.role, 'OWNER'));
    expect(owners).toHaveLength(1);
    const id = owners[0]?.id;
    if (id === undefined) {
      throw new Error('No remaining OWNER');
    }
    const surviving = id === first.principal.id ? first : second;
    await expect(service.status(id, 'BANNED', surviving.principal)).rejects.toThrow(
      'последнего OWNER',
    );
    const admin = await account('ADMIN');
    await expect(service.roles(id, ['PLAYER'], admin.principal)).rejects.toThrow('OWNER');
  });

  it('rechecks active status inside account writes after authentication has already happened', async () => {
    const { principal } = await account('PLAYER');
    await persistence()
      .db.update(users)
      .set({ status: 'SUSPENDED' })
      .where(eq(users.id, principal.id));
    const identity = new IdentityService(persistence().db);
    await expect(
      identity.rename(principal.id, 'SuspendedRename', 'A long editorial test password'),
    ).rejects.toThrow('Аккаунт недоступен');
    await expect(
      identity.changePassword(
        principal.id,
        'A long editorial test password',
        'A different sufficiently long password',
      ),
    ).rejects.toThrow('Аккаунт недоступен');
  });

  it('makes UUID and audit evidence immutable at the PostgreSQL boundary', async () => {
    const { principal } = await account('PLAYER');
    await expect(
      persistence()
        .db.update(users)
        .set({ id: crypto.randomUUID() })
        .where(eq(users.id, principal.id)),
    ).rejects.toThrow();
    await persistence().db.insert(adminAuditLog).values({
      actorId: principal.id,
      action: 'test.evidence',
      targetType: 'user',
      targetId: principal.id,
    });
    await expect(
      persistence()
        .db.update(adminAuditLog)
        .set({ action: 'tampered' })
        .where(eq(adminAuditLog.actorId, principal.id)),
    ).rejects.toThrow();
    await expect(
      persistence().db.delete(adminAuditLog).where(eq(adminAuditLog.actorId, principal.id)),
    ).rejects.toThrow();
    await expect(
      persistence().db.execute(sql`select id from users where id = ${principal.id}`),
    ).resolves.toBeDefined();
  });
});
