// oxlint-disable import/max-dependencies -- The scenario exercises real authentication, PostgreSQL, S3 and the public settings boundary.
// oxlint-disable max-lines-per-function, max-statements -- Keep the complete administrator-to-public settings lifecycle and its fixed HTTP assertions together.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait } from 'testcontainers';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db';
import { userRoles, adminAuditLog } from '../src/db/schema';
import { createStorage } from '../src/storage';
import { createApp } from '../src/app';
import { IdentityService } from '../src/modules/identity/service';
import { SessionService } from '../src/modules/sessions/service';
import { SiteSettingsSchema } from '../src/modules/site-settings/contracts';

const ORIGIN = 'https://helicraft.test';
describe('persisted server identity settings', () => {
  it('protects settings, persists identity across app instances, publishes only safe logos and audits changes', async () => {
    const postgres = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(postgres.getConnectionUri());
    const container = await new GenericContainer('chrislusf/seaweedfs:4.48')
      .withCommand(['mini', '-dir=/data', '-s3.port=8333'])
      .withEnvironment({
        AWS_ACCESS_KEY_ID: 'settings-test',
        AWS_SECRET_ACCESS_KEY: 'settings-secret',
        S3_BUCKET: 'helicraft',
      })
      .withExposedPorts(8333)
      .withWaitStrategy(Wait.forLogMessage('All enabled components are running and ready to use:'))
      .start();
    const storage = createStorage({
      S3_ENDPOINT: `http://${container.getHost()}:${container.getMappedPort(8333)}`,
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'settings-test',
      S3_SECRET_KEY: 'settings-secret',
    });
    try {
      await migrate(database.db, { migrationsFolder: './drizzle' });
      const identity = new IdentityService(database.db);
      const token = await identity.register('SettingsAdmin', 'A sufficiently long password');
      const { principal } = await new SessionService(database.db).authenticate(token);
      const dependencies = {
        db: database.db,
        storage,
        bucket: 'helicraft',
        siteOrigin: ORIGIN,
        minecraftAddress: 'old.example.test',
        checkReady: async (): Promise<void> => {
          await Promise.resolve();
        },
      };
      const api = createApp(dependencies);
      const headers = {
        Origin: ORIGIN,
        Cookie: `helicraft_session=${token}`,
        'Content-Type': 'application/json',
      };
      const body = JSON.stringify({
        serverName: 'Aurora',
        minecraftAddress: 'play.example.test:25565',
        githubUrl: 'https://github.com/example/server',
      });
      expect((await api.request('/api/v1/admin/site-settings')).status).toBe(401);
      expect((await api.request('/api/v1/admin/site-settings', { headers })).status).toBe(403);
      expect(
        (await api.request('/api/v1/admin/site-settings', { method: 'PUT', headers, body })).status,
      ).toBe(403);
      await database.db.insert(userRoles).values({ userId: principal.id, role: 'ADMIN' });
      const saved = await api.request('/api/v1/admin/site-settings', {
        method: 'PUT',
        headers,
        body,
      });
      expect(saved.status).toBe(200);
      expect(SiteSettingsSchema.parse(await saved.json()).serverName).toBe('Aurora');
      const prelaunch = await api.request('/api/v1/public/site');
      expect(await prelaunch.json()).toMatchObject({
        serverName: 'Aurora',
        minecraftAddress: null,
      });
      const restarted = createApp({ ...dependencies, sitePhase: 'OPEN' });
      const publicSettings = await restarted.request('/api/v1/public/site');
      expect(await publicSettings.json()).toMatchObject({
        serverName: 'Aurora',
        minecraftAddress: 'play.example.test:25565',
        githubUrl: 'https://github.com/example/server',
      });
      expect(
        (
          await api.request('/api/v1/admin/site-settings', {
            method: 'PUT',
            headers: { ...headers, Origin: 'https://evil.test' },
            body,
          })
        ).status,
      ).toBe(403);
      const png = await sharp({
        create: { width: 600, height: 300, channels: 4, background: '#6688aa' },
      })
        .png()
        .toBuffer();
      const form = new FormData();
      form.set('file', new File([new Uint8Array(png)], 'logo.png', { type: 'image/png' }));
      const upload = await api.request('/api/v1/admin/site-settings/logo', {
        method: 'POST',
        headers: { Origin: ORIGIN, Cookie: `helicraft_session=${token}` },
        body: form,
      });
      expect(upload.status).toBe(200);
      const logo = SiteSettingsSchema.parse(await upload.json());
      expect(logo.serverName).toBe('Aurora');
      expect(logo.logoUrl).toContain('/api/v1/public/site/logo.png?v=');
      const image = await api.request(logo.logoUrl ?? '');
      expect(image.status).toBe(200);
      expect(image.headers.get('content-type')).toBe('image/png');
      expect((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).width).toBe(512);
      const invalid = new FormData();
      invalid.set('file', new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
      expect(
        (
          await api.request('/api/v1/admin/site-settings/logo', {
            method: 'POST',
            headers: { Origin: ORIGIN, Cookie: `helicraft_session=${token}` },
            body: invalid,
          })
        ).status,
      ).toBe(400);
      const unchanged = await api.request('/api/v1/admin/site-settings', { headers });
      expect(SiteSettingsSchema.parse(await unchanged.json()).logoUrl).toBe(logo.logoUrl);
      expect(
        (await api.request('/api/v1/admin/site-settings/logo', { method: 'DELETE', headers }))
          .status,
      ).toBe(200);
      expect((await api.request('/api/v1/public/site/logo.png')).status).toBe(404);
      expect(
        await database.db.select().from(adminAuditLog).where(eq(adminAuditLog.targetType, 'site')),
      ).toHaveLength(3);
      await database.db.delete(userRoles).where(eq(userRoles.role, 'ADMIN'));
      expect(
        (await api.request('/api/v1/admin/site-settings', { method: 'PUT', headers, body })).status,
      ).toBe(403);
    } finally {
      storage.destroy();
      await database.pool.end();
      await container.stop();
      await postgres.stop();
    }
  });
});
