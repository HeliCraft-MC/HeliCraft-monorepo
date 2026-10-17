// oxlint-disable import/max-dependencies -- The photo lifecycle adds an independent state-relationship persistence scenario.
// oxlint-disable max-lines-per-function -- Sequential end-to-end lifecycle intentionally retains its assertions and cleanup in one scenario.
import { assertGalleryStates } from './gallery-states-scenario';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait } from 'testcontainers';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { createDatabase } from '../src/db';
import { createStorage } from '../src/storage';
import { createApp } from '../src/app';
import { IdentityService } from '../src/modules/identity/service';
import {
  GalleryItemSchema,
  GalleryListSchema,
  GalleryPlayerListSchema,
} from '../src/modules/gallery/contracts';

const ORIGIN = 'https://helicraft.test';
function uploadForm(image: Uint8Array): FormData {
  const form = new FormData();
  form.set('file', new File([new Uint8Array(image)], 'world.png', { type: 'image/png' }));
  form.set(
    'metadata',
    JSON.stringify({
      title: 'Порт',
      alt: 'Причал и город',
      place: 'Побережье',
      originalLanguage: 'ru',
      translations: { en: { title: 'Harbour', alt: 'Dock and town' } },
    }),
  );
  return form;
}
async function verifyPlayerSearch(
  app: ReturnType<typeof createApp>,
  headers: Record<string, string>,
): Promise<string> {
  const response = await app.request('/api/v1/account/gallery/players?query=gAlLeRy', { headers });
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const { items } = GalleryPlayerListSchema.parse(await response.json());
  expect(items.map((player) => player.name)).toStrictEqual(['GalleryOther', 'GalleryOwner']);
  const literal = await app.request('/api/v1/account/gallery/players?query=Gallery_', { headers });
  expect(GalleryPlayerListSchema.parse(await literal.json()).items).toStrictEqual([]);
  const other = items.find((player) => player.name === 'GalleryOther');
  if (!other) {
    throw new Error('Search did not return the other player');
  }
  return other.id;
}
async function taggedUploadForm(
  image: Uint8Array,
  app: ReturnType<typeof createApp>,
  headers: Record<string, string>,
): Promise<FormData> {
  const taggedPlayer = await verifyPlayerSearch(app, headers);
  const form = uploadForm(image);
  form.set(
    'metadata',
    JSON.stringify({
      title: 'Порт',
      alt: 'Причал и город',
      originalLanguage: 'ru',
      translations: { en: { title: 'Harbour' } },
      players: [taggedPlayer],
    }),
  );
  return form;
}
async function verifyCaptionUpdates(
  app: ReturnType<typeof createApp>,
  item: ReturnType<typeof GalleryItemSchema.parse>,
  auth: Readonly<{ headers: Record<string, string>; other: string }>,
): Promise<void> {
  expect(item.players.map((player) => player.name)).toStrictEqual(['GalleryOther']);
  const { headers, other } = auth;
  const changedMetadata = {
    title: item.title,
    alt: item.alt,
    originalLanguage: 'ru',
    translations: { en: { title: 'New harbour' } },
    players: [],
  };
  const update = await app.request(`/api/v1/account/gallery/${item.id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(changedMetadata),
  });
  expect(update.status).toBe(200);
  expect(GalleryItemSchema.parse(await update.json()).translations.en?.title).toBe('New harbour');
  const deniedUpdate = await app.request(`/api/v1/account/gallery/${item.id}`, {
    method: 'PATCH',
    headers: {
      Origin: ORIGIN,
      Cookie: `helicraft_session=${other}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changedMetadata),
  });
  expect(deniedUpdate.status).toBe(404);
}
describe('gallery lifecycle with private S3 and PostgreSQL', () => {
  it('authenticates uploads, rejects invalid files, serves public metadata, restricts deletion and handles storage failure', async () => {
    const postgres = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(postgres.getConnectionUri());
    const container = await new GenericContainer('chrislusf/seaweedfs:4.48')
      .withCommand(['mini', '-dir=/data', '-s3.port=8333'])
      .withEnvironment({
        AWS_ACCESS_KEY_ID: 'gallery-test',
        AWS_SECRET_ACCESS_KEY: 'gallery-secret',
        S3_BUCKET: 'helicraft',
      })
      .withExposedPorts(8333)
      .withWaitStrategy(Wait.forLogMessage('All enabled components are running and ready to use:'))
      .start();
    const storageConfig = {
      S3_ENDPOINT: `http://${container.getHost()}:${container.getMappedPort(8333)}`,
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'gallery-test',
      S3_SECRET_KEY: 'gallery-secret',
    };
    const storage = createStorage(storageConfig);
    const failedStorage = createStorage({ ...storageConfig, S3_ENDPOINT: 'http://127.0.0.1:1' });
    try {
      await migrate(database.db, { migrationsFolder: './drizzle' });
      const identity = new IdentityService(database.db);
      const owner = await identity.register('GalleryOwner', 'A sufficiently long password');
      const other = await identity.register('GalleryOther', 'A sufficiently long password');
      const dependencies = {
        db: database.db,
        storage,
        bucket: 'helicraft',
        siteOrigin: ORIGIN,
        checkReady: async (): Promise<void> => {
          await Promise.resolve();
        },
      };
      const app = createApp(dependencies);
      const image = new Uint8Array(
        await sharp({ create: { width: 600, height: 400, channels: 3, background: '#334433' } })
          .png()
          .toBuffer(),
      );
      const headers = { Origin: ORIGIN, Cookie: `helicraft_session=${owner}` };
      const denied = await app.request('/api/v1/account/gallery', {
        method: 'POST',
        headers: { Origin: ORIGIN },
        body: uploadForm(image),
      });
      expect(denied.status).toBe(401);
      const invalid = await app.request('/api/v1/account/gallery', {
        method: 'POST',
        headers,
        body: uploadForm(new Uint8Array([0, 1, 2])),
      });
      expect(invalid.status).toBe(400);
      const accepted = await app.request('/api/v1/account/gallery', {
        method: 'POST',
        headers,
        body: await taggedUploadForm(image, app, headers),
      });
      expect(accepted.status).toBe(200);
      const item = GalleryItemSchema.parse(await accepted.json());
      expect(item.translations.en?.title).toBe('Harbour');
      await verifyCaptionUpdates(app, item, { headers, other });
      await assertGalleryStates(database.db, app, { item, headers });
      const list = GalleryListSchema.parse(
        await (await app.request('/api/v1/public/gallery')).json(),
      );
      expect(list.total).toBe(1);
      expect(list.items[0]?.id).toBe(item.id);
      const publicImage = await app.request(item.imageUrl);
      expect(publicImage.status).toBe(200);
      expect(publicImage.headers.get('content-type')).toBe('image/webp');
      const unauthorized = await app.request(`/api/v1/account/gallery/${item.id}`, {
        method: 'DELETE',
        headers: { Origin: ORIGIN, Cookie: `helicraft_session=${other}` },
      });
      expect(unauthorized.status).toBe(404);
      const failed = createApp({ ...dependencies, storage: failedStorage });
      expect((await failed.request(item.imageUrl)).status).toBe(503);
      expect(
        (
          await failed.request('/api/v1/account/gallery', {
            method: 'POST',
            headers,
            body: uploadForm(image),
          })
        ).status,
      ).toBe(503);
      const unchanged = GalleryListSchema.parse(
        await (await app.request('/api/v1/public/gallery')).json(),
      );
      expect(unchanged.total).toBe(1);
      await identity.rename(item.author.id, 'GalleryRenamed', 'A sufficiently long password');
      const detail = GalleryItemSchema.parse(
        await (await app.request(`/api/v1/public/gallery/${item.id}`)).json(),
      );
      expect(detail.author).toStrictEqual({ id: item.author.id, name: 'GalleryRenamed' });
      expect(
        (await app.request(`/api/v1/account/gallery/${item.id}`, { method: 'DELETE', headers }))
          .status,
      ).toBe(200);
      expect((await app.request(item.imageUrl)).status).toBe(404);
      expect((await app.request(`/api/v1/public/gallery/${item.id}`)).status).toBe(404);
      expect(
        GalleryListSchema.parse(await (await app.request('/api/v1/public/gallery')).json()).total,
      ).toBe(0);
    } finally {
      storage.destroy();
      failedStorage.destroy();
      await database.pool.end();
      await container.stop();
      await postgres.stop();
    }
  }, 120_000);
});
