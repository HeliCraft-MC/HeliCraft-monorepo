// oxlint-disable import/max-dependencies -- Integration exercises real persistence, storage and domain boundaries together.
import { readFile } from 'node:fs/promises';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait } from 'testcontainers';
import { describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '../src/db';
import { createStorage } from '../src/storage';
import { createApp } from '../src/app';
import { IdentityService } from '../src/modules/identity/service';
import { SessionService } from '../src/modules/sessions/service';
import { SkinService } from '../src/modules/skins/service';

describe('persistent skin lifecycle', () => {
  it('uploads private S3 assets, switches atomically, rejects unauthenticated writes and resets', async () => {
    const postgres = await new PostgreSqlContainer('postgis/postgis:18-3.6').start();
    const database = createDatabase(postgres.getConnectionUri());
    const container = await new GenericContainer('chrislusf/seaweedfs:4.48')
      .withCommand(['mini', '-dir=/data', '-s3.port=8333'])
      .withEnvironment({
        AWS_ACCESS_KEY_ID: 'skin-test-access',
        AWS_SECRET_ACCESS_KEY: 'skin-test-secret',
        S3_BUCKET: 'helicraft',
      })
      .withExposedPorts(8333)
      .withWaitStrategy(Wait.forLogMessage('All enabled components are running and ready to use:'))
      .start();
    const storage = createStorage({
      S3_ENDPOINT: `http://${container.getHost()}:${container.getMappedPort(8333)}`,
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'skin-test-access',
      S3_SECRET_KEY: 'skin-test-secret',
    });
    const failedStorage = createStorage({
      S3_ENDPOINT: 'http://127.0.0.1:1',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'unused',
      S3_SECRET_KEY: 'unused',
    });
    try {
      await migrate(database.db, { migrationsFolder: './drizzle' });
      const token = await new IdentityService(database.db).register(
        'SkinTester',
        'A sufficiently long password',
      );
      const { principal } = await new SessionService(database.db).authenticate(token);
      const service = new SkinService(database.db, storage, 'helicraft');
      const fixture = await readFile(new URL('fixtures/modern-overlay.png', import.meta.url));
      const skin = await service.upload(principal.id, fixture, 'SLIM');
      expect(skin.model).toBe('SLIM');
      expect((await service.current(principal.id))?.id).toBe(skin.id);
      expect(await service.image(principal.id, true)).not.toBeNull();
      const failing = new SkinService(database.db, failedStorage, 'helicraft');
      await expect(failing.upload(principal.id, fixture, 'CLASSIC')).rejects.toThrow(
        'Текущий скин сохранён',
      );
      expect((await service.current(principal.id))?.id).toBe(skin.id);
      const legacy = await readFile(new URL('fixtures/legacy-overlay.png', import.meta.url));
      await expect(service.upload(principal.id, legacy, 'SLIM')).rejects.toThrow('Classic');
      const classic = await service.upload(principal.id, legacy, 'CLASSIC');
      expect(classic.id).not.toBe(skin.id);
      const api = createApp({
        db: database.db,
        storage,
        bucket: 'helicraft',
        siteOrigin: 'https://helicraft.test',
        checkReady: async () => {
          await Promise.resolve();
        },
      });
      const image = await api.request(`/api/v1/public/players/${principal.id}/avatar.png`);
      expect(image.status).toBe(200);
      expect(image.headers.get('content-type')).toBe('image/png');
      const form = new FormData();
      form.set('file', new File([new Uint8Array(fixture)], 'skin.png', { type: 'image/png' }));
      form.set('model', 'CLASSIC');
      const denied = await api.request('/api/v1/account/skin', {
        method: 'POST',
        headers: { Origin: 'https://helicraft.test' },
        body: form,
      });
      expect(denied.status).toBe(401);
      const accepted = await api.request('/api/v1/account/skin', {
        method: 'POST',
        headers: { Origin: 'https://helicraft.test', Cookie: `helicraft_session=${token}` },
        body: form,
      });
      expect(accepted.status).toBe(200);
      await service.reset(principal.id);
      expect(await service.current(principal.id)).toBeNull();
    } finally {
      storage.destroy();
      failedStorage.destroy();
      await database.pool.end();
      await container.stop();
      await postgres.stop();
    }
  }, 120_000);
});
