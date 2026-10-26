// oxlint-disable import/max-dependencies -- Real HTTP acceptance covers browser/service authorization and the renderer isolation boundary.
import { createHash } from 'node:crypto';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { it, expect } from 'vitest';
import { z } from 'zod';
import sharp from 'sharp';
import { createDatabase } from '../src/db';
import { createApp } from '../src/app';
import { SessionService } from '../src/modules/sessions/service';
import { SpatialWorldService } from '../src/modules/spatial/worlds';
import { TerritoryDraftSchema } from '../src/modules/spatial/contracts';
import { monetaryFixture } from './monetary-fixture';
import { addTerritorialAuthority, rectangle } from './spatial-fixture';

const ORIGIN = 'http://localhost:5173';
const DENEB = {
  id: 'deneb-spatial',
  role: 'DENEB',
  backendId: 'deneb',
  token: 'd'.repeat(43),
} as const;
const RIGEL = {
  id: 'rigel-spatial',
  role: 'RIGEL',
  backendId: 'deneb',
  token: 'r'.repeat(43),
} as const;
const OTHER = {
  id: 'other-spatial',
  role: 'DENEB',
  backendId: 'other',
  token: 'o'.repeat(43),
} as const;
function post(body: unknown, cookie?: string, token?: string): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      ...(cookie === undefined ? {} : { Cookie: cookie }),
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  };
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- One disposable stack exercises the full public/private/service and tile-proxy attack boundary.
it('keeps drafts private, checks exact world/backend identities and proxies only registered numeric PNG tiles', async () => {
  const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
    .withDatabase('helicraft_spatial_api_test')
    .start();
  const database = createDatabase(container.getConnectionUri());
  let renderer: ReturnType<typeof Bun.serve> | null = null;
  try {
    await migrate(database.db, { migrationsFolder: './drizzle' });
    const first = await monetaryFixture(database.db, 'AP');
    const second = await monetaryFixture(database.db, 'AQ');
    await addTerritorialAuthority(database.db, first);
    await addTerritorialAuthority(database.db, second);
    const sessions = new SessionService(database.db);
    const founderCookie = `helicraft_session=${await sessions.issue(first.founderId)}`;
    const otherCookie = `helicraft_session=${await sessions.issue(second.founderId)}`;
    const adminCookie = `helicraft_session=${await sessions.issue(first.adminId)}`;
    const world = await new SpatialWorldService(database.db).register(first.adminId, {
      logicalKey: 'api-spatial',
      backendId: 'deneb',
      paperWorldId: crypto.randomUUID(),
      dimension: 'minecraft:overworld',
      name: { en: 'API world' },
      tileKey: 'minecraft_overworld',
      maxZoom: 3,
      extraZoom: 2,
    });
    const requested: { path: string; cookie: string | null }[] = [];
    let mode: 'PNG' | 'REDIRECT' | 'HTML' = 'PNG';
    const png = new Uint8Array(
      await sharp({ create: { width: 512, height: 512, channels: 4, background: '#225588' } })
        .png()
        .toBuffer(),
    );
    renderer = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch: (request) => {
        requested.push({
          path: new URL(request.url).pathname,
          cookie: request.headers.get('cookie'),
        });
        if (mode === 'REDIRECT') {
          return new Response(null, {
            status: 302,
            headers: { Location: 'http://127.0.0.1:1/private' },
          });
        }
        return new Response(mode === 'PNG' ? png : '<html>private renderer error</html>', {
          headers: { 'Content-Type': 'image/png' },
        });
      },
    });
    const api = createApp({
      db: database.db,
      siteOrigin: ORIGIN,
      minecraftActors: [DENEB, RIGEL, OTHER],
      squaremapTileSources: [{ backendId: 'deneb', origin: renderer.url.origin }],
      checkReady: async () => {
        await Promise.resolve();
      },
    });
    const creation = {
      worldId: world.id,
      geometry: rectangle(-32, -32, 32, 32),
      reason: { en: 'Private draft justification never public' },
      change: 'INITIAL',
    };
    expect(
      (
        await api.request(
          `/api/v1/account/states/${first.stateId}/territory/drafts`,
          post(creation),
        )
      ).status,
    ).toBe(401);
    const created = await api.request(
      `/api/v1/account/states/${first.stateId}/territory/drafts`,
      post(creation, founderCookie),
    );
    expect(created.status).toBe(200);
    const draft = TerritoryDraftSchema.parse(await created.json());
    expect(
      (
        await api.request(`/api/v1/account/territory/drafts/${draft.id}`, {
          headers: { Cookie: otherCookie },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await api.request(
          `/api/v1/account/states/${second.stateId}/territory/drafts`,
          post(creation, founderCookie),
        )
      ).status,
    ).toBe(404);
    const noOrigin = post(creation, founderCookie);
    expect(
      (
        await api.request(`/api/v1/account/states/${first.stateId}/territory/drafts`, {
          ...noOrigin,
          headers: { 'Content-Type': 'application/json', Cookie: founderCookie },
        })
      ).status,
    ).toBe(403);
    const publicMap = await api.request(`/api/v1/public/spatial/worlds/${world.id}/territories`, {
      headers: { Cookie: founderCookie },
    });
    expect(publicMap.status).toBe(200);
    expect(await publicMap.text()).not.toContain('Private draft justification');
    const identity = { worldId: world.id, paperWorldId: world.paperWorldId };
    expect(
      (
        await api.request(
          '/api/v1/internal/minecraft/spatial/version',
          post(identity, undefined, RIGEL.token),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await api.request(
          '/api/v1/internal/minecraft/spatial/version',
          post(identity, undefined, OTHER.token),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await api.request(
          '/api/v1/internal/minecraft/spatial/version',
          post(identity, founderCookie, DENEB.token),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await api.request(
          '/api/v1/internal/minecraft/spatial/version',
          post({ ...identity, paperWorldId: crypto.randomUUID() }, undefined, DENEB.token),
        )
      ).status,
    ).toBe(404);
    const response = await api.request(
      '/api/v1/internal/minecraft/spatial/snapshot',
      post(identity, undefined, DENEB.token),
    );
    expect(response.status).toBe(200);
    const snapshot = z
      .object({ integrity: z.string(), payload: z.string() })
      .parse(await response.json());
    expect(createHash('sha256').update(snapshot.payload).digest('hex')).toBe(snapshot.integrity);
    const tile = await api.request(
      `/api/v1/public/spatial/worlds/${world.id}/tiles/3/0/0?url=http://127.0.0.1:1/private`,
      { headers: { Cookie: founderCookie } },
    );
    expect(tile.status).toBe(200);
    expect(new Uint8Array(await tile.arrayBuffer())).toEqual(png);
    expect(requested).toEqual([{ path: '/tiles/minecraft_overworld/3/0_0.png', cookie: null }]);
    expect(
      (await api.request(`/api/v1/public/spatial/worlds/${world.id}/tiles/8/0/0`)).status,
    ).toBe(404);
    expect(
      (await api.request(`/api/v1/public/spatial/worlds/${world.id}/tiles/3/%2e%2e%2fplayers/0`))
        .status,
    ).toBe(400);
    mode = 'REDIRECT';
    expect(
      (await api.request(`/api/v1/public/spatial/worlds/${world.id}/tiles/3/0/0`)).status,
    ).toBe(503);
    mode = 'HTML';
    expect(
      (await api.request(`/api/v1/public/spatial/worlds/${world.id}/tiles/3/0/0`)).status,
    ).toBe(503);
    expect(
      requested.every((request) => request.path === '/tiles/minecraft_overworld/3/0_0.png'),
    ).toBe(true);
    expect(
      (
        await api.request(
          '/api/v1/admin/spatial/worlds',
          post({ logicalKey: 'denied' }, adminCookie),
        )
      ).status,
    ).toBe(400);
  } finally {
    await renderer?.stop(true);
    await database.pool.end();
    await container.stop();
  }
});
