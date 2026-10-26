// oxlint-disable no-magic-numbers, unicorn/no-await-expression-member, max-lines, max-lines-per-function, max-statements, no-await-in-loop -- Sequential native acceptance uses bounded disposable coordinates/timeouts and the real shared Governance/API.
import { expect } from '@playwright/test';
import type { Browser } from '@playwright/test';
import { verifyMapUi } from './map-ui';
import { updateTerritoryThroughVega } from './map-hot-update';
import { z } from 'zod';
import type { Database } from '../../apps/antares/src/db';
import { SessionService } from '../../apps/antares/src/modules/sessions/service';
import {
  TerritoryDraftSchema,
  SpatialWorldSchema,
  SpatialSnapshotSchema,
  SpatialAnalysisSchema,
} from '../../apps/antares/src/modules/spatial/contracts';
import type {
  TerritoryGeometry,
  TerritoryDraftInput,
} from '../../apps/antares/src/modules/spatial/contracts';
import { monetaryFixture } from '../../apps/antares/tests/monetary-fixture';
import { addTerritorialAuthority, rectangle } from '../../apps/antares/tests/spatial-fixture';
import type { ProtocolConnection } from './client';

interface TerritorialRuntimeContext {
  readonly db: Database['db'];
  readonly browser: Browser;
  readonly run: string;
  readonly origin: string;
  readonly username: string;
  readonly player: ProtocolConnection;
  readonly paperPid: () => number | undefined;
  readonly console: (command: string) => Promise<void>;
  readonly waitUntil: (predicate: () => Promise<boolean>, description: string) => Promise<void>;
  readonly spatialUnavailable: (unavailable: boolean) => void;
}
const Id = z.object({ id: z.uuid() });
const Applications = z.object({
  items: z.array(z.object({ id: z.uuid(), draft: TerritoryDraftSchema })),
});
const Reviewed = z.object({ revisionId: z.uuid().nullable() });
function auroraGeometry(maxX: number): TerritoryGeometry {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [0, -16],
        [maxX, -16],
        [maxX, 16],
        [0, 16],
        [0, -16],
      ],
      [
        [4, -4],
        [4, 4],
        [6, 4],
        [6, -4],
        [4, -4],
      ],
    ],
  };
}
// oxlint-disable-next-line max-params -- Native acceptance keeps context, route, actor cookie, body and response schema explicit at every real HTTP assertion.
async function apiCall<Schema extends z.ZodType>(
  context: TerritorialRuntimeContext,
  path: string,
  cookie: string,
  body: unknown,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const response = await fetch(`${context.origin}/api/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Origin: context.origin, Cookie: cookie, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new Error(`Territorial runtime API ${path} failed HTTP ${response.status}`);
  }
  return schema.parse(await response.json());
}
async function paperLog(context: TerritorialRuntimeContext): Promise<string> {
  return await Bun.file(`${context.run}/paper.log`).text();
}
async function consoleEvidence(
  context: TerritorialRuntimeContext,
  command: string,
  expected: string,
): Promise<void> {
  const offset = (await paperLog(context)).length;
  await context.console(command);
  await context.waitUntil(
    async () => (await paperLog(context)).slice(offset).includes(expected),
    `Paper command ${expected}`,
  );
}
async function whereami(
  context: TerritorialRuntimeContext,
  expected: string,
  version?: number,
): Promise<string> {
  const offset = context.player.messages.length;
  context.player.client.chat('/heli whereami');
  await context.player.waitFor(
    () => context.player.messages.slice(offset).join(' ').includes(expected),
    `whereami ${expected}`,
  );
  if (version !== undefined) {
    await context.player.waitFor(
      () => context.player.messages.slice(offset).join(' ').includes(`revision ${version}`),
      `snapshot version ${version}`,
    );
  }
  return context.player.messages.slice(offset).join(' ');
}
async function teleport(
  context: TerritorialRuntimeContext,
  x: number,
  title?: string,
): Promise<void> {
  const positions = context.player.positions.length;
  const titles = context.player.titles.length;
  await context.console(`execute in minecraft:overworld run tp ${context.username} ${x} 301 0.5`);
  await context.player.waitFor(
    () => context.player.positions.length > positions,
    'real teleport packet',
  );
  if (title !== undefined) {
    await context.player.waitFor(
      () => context.player.titles.slice(titles).join(' ').includes(title),
      `teleport title ${title}`,
    );
  }
}
async function publish(
  context: TerritorialRuntimeContext,
  input: Readonly<{
    stateId: string;
    worldId: string;
    actorCookie: string;
    adminCookie: string;
    geometry: TerritoryGeometry;
    change: TerritoryDraftInput['change'];
  }>,
): Promise<string> {
  const draft = await apiCall(
    context,
    `account/states/${input.stateId}/territory/drafts`,
    input.actorCookie,
    {
      worldId: input.worldId,
      geometry: input.geometry,
      reason: { en: 'Disposable native 26.3 territorial acceptance' },
      change: input.change,
    },
    TerritoryDraftSchema,
  );
  const preview = await apiCall(
    context,
    `account/territory/drafts/${draft.id}/preview`,
    input.actorCookie,
    {},
    SpatialAnalysisSchema,
  );
  expect(preview.valid).toBe(true);
  expect(preview.conflicts).toHaveLength(0);
  await apiCall(
    context,
    `account/territory/drafts/${draft.id}/submit`,
    input.actorCookie,
    { version: draft.version },
    Id,
  );
  const queue = await apiCall(
    context,
    'admin/spatial/applications',
    input.adminCookie,
    undefined,
    Applications,
  );
  const application = queue.items.find((item) => item.draft.id === draft.id);
  if (!application) {
    throw new Error('State decision did not reach administrative review');
  }
  const reviewed = await apiCall(
    context,
    `admin/spatial/applications/${application.id}/review`,
    input.adminCookie,
    {
      decision: 'APPROVE',
      reason: 'Exact native test geometry, Governance and current conflicts verified',
    },
    Reviewed,
  );
  if (reviewed.revisionId === null) {
    throw new Error('Territory was not published');
  }
  return reviewed.revisionId;
}
async function snapshot(
  context: TerritorialRuntimeContext,
  worldId: string,
): Promise<z.infer<typeof SpatialSnapshotSchema>> {
  const response = await fetch(
    `${context.origin}/api/v1/public/spatial/worlds/${worldId}/territories`,
  );
  expect(response.ok).toBe(true);
  return SpatialSnapshotSchema.parse(await response.json());
}
async function verifyTiles(
  context: TerritorialRuntimeContext,
  worldId: string,
): Promise<Readonly<{ before: string; after: string; background: string }>> {
  await consoleEvidence(context, 'save-all flush', 'Saved the game');
  await consoleEvidence(
    context,
    'squaremap radiusrender minecraft:overworld 64 0 0',
    'Finished rendering map',
  );
  const tileUrl = `${context.origin}/api/v1/public/spatial/worlds/${worldId}/tiles/3/0/0`;
  const beforeResponse = await fetch(tileUrl);
  expect(beforeResponse.ok).toBe(true);
  const before = new Uint8Array(await beforeResponse.arrayBuffer());
  await Bun.write(`${context.run}/squaremap-before.png`, before);
  await consoleEvidence(
    context,
    'execute in minecraft:overworld run fill 8 300 8 11 300 11 minecraft:gold_block',
    'Successfully filled 16 block(s)',
  );
  await consoleEvidence(context, 'save-all flush', 'Saved the game');
  await consoleEvidence(
    context,
    'squaremap radiusrender minecraft:overworld 64 0 0',
    'Finished rendering map',
  );
  const afterResponse = await fetch(tileUrl);
  expect(afterResponse.ok).toBe(true);
  const after = new Uint8Array(await afterResponse.arrayBuffer());
  await Bun.write(`${context.run}/squaremap-after.png`, after);
  const hashes = {
    before: new Bun.CryptoHasher('sha256').update(before).digest('hex'),
    after: new Bun.CryptoHasher('sha256').update(after).digest('hex'),
  };
  expect(hashes.before).not.toBe(hashes.after);
  await consoleEvidence(
    context,
    'execute in minecraft:overworld run fill 8 300 8 11 300 11 minecraft:diamond_block',
    'Successfully filled 16 block(s)',
  );
  await consoleEvidence(context, 'save-all flush', 'Saved the game');
  let background = hashes.after;
  await context.waitUntil(async () => {
    const response = await fetch(tileUrl, { cache: 'no-store' });
    if (!response.ok) {
      return false;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    background = new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
    if (background === hashes.after) {
      return false;
    }
    await Bun.write(`${context.run}/squaremap-background.png`, bytes);
    return true;
  }, 'automatic squaremap background update after block changes');
  return { ...hashes, background };
}
async function verifyVehicleAndDimensions(context: TerritorialRuntimeContext): Promise<void> {
  await teleport(context, 8, 'Aurora');
  await context.console(
    'execute in minecraft:overworld run fill -8 300 0 40 300 0 minecraft:redstone_block',
  );
  await context.console(
    'execute in minecraft:overworld run fill -8 301 0 40 301 0 minecraft:powered_rail[shape=east_west,powered=true]',
  );
  await context.console(
    'execute in minecraft:overworld run summon minecraft:minecart 8.5 301.1 0.5 {Tags:["hc_spatial_test"],Motion:[0.3d,0.0d,0.0d]}',
  );
  const vehicleTitles = context.player.titles.length;
  await context.console(
    `ride ${context.username} mount @e[type=minecraft:minecart,tag=hc_spatial_test,limit=1]`,
  );
  await context.player.waitFor(
    () => context.player.titles.slice(vehicleTitles).join(' ').includes('Loria'),
    'vanilla powered-minecart boundary crossing',
  );
  await context.player.waitFor(
    () => context.player.titles.slice(vehicleTitles).join(' ').includes('Wilderness'),
    'moving vehicle exits state territory',
  );
  await context.console('kill @e[tag=hc_spatial_test]');
  await context.console('execute in minecraft:overworld run fill -8 301 0 40 301 0 minecraft:air');
  await teleport(context, 8, 'Aurora');
  for (const dimension of ['minecraft:the_nether', 'minecraft:the_end']) {
    const titles = context.player.titles.length;
    await context.console(`execute in ${dimension} run tp ${context.username} 0.5 100 0.5`);
    await context.player.waitFor(
      () => context.player.titles.slice(titles).join(' ').includes('Wilderness'),
      `commons in ${dimension}`,
    );
    await whereami(context, 'Wilderness');
    await teleport(context, 8, 'Aurora');
  }
}
async function verifyTerritoryRuntime(
  context: TerritorialRuntimeContext,
): Promise<Readonly<Record<string, unknown>>> {
  const originalPid = context.paperPid();
  const first = await monetaryFixture(context.db, 'TA');
  const second = await monetaryFixture(context.db, 'TB');
  await addTerritorialAuthority(context.db, { ...first, name: { en: 'Aurora', ru: 'Аврора' } });
  await addTerritorialAuthority(context.db, { ...second, name: { en: 'Loria', ru: 'Лория' } });
  const sessions = new SessionService(context.db);
  const actorCookie = `helicraft_session=${await sessions.issue(first.founderId)}`;
  const otherCookie = `helicraft_session=${await sessions.issue(second.founderId)}`;
  const adminCookie = `helicraft_session=${await sessions.issue(first.adminId)}`;
  const match = /Spatial Paper world (?<id>[\da-f-]{36}) dimension minecraft:overworld/u.exec(
    await paperLog(context),
  );
  const paperWorldId = z.uuid().parse(match?.groups?.id);
  const registered = await fetch(`${context.origin}/api/v1/public/spatial/worlds`);
  expect(registered.ok).toBe(true);
  const worlds = z.object({ items: z.array(SpatialWorldSchema) }).parse(await registered.json());
  expect(worlds.items).toHaveLength(1);
  const world = SpatialWorldSchema.parse(worlds.items[0]);
  expect(world.paperWorldId).toBe(paperWorldId);
  expect(world.dimension).toBe('minecraft:overworld');
  expect(world.backendId).toBe('deneb');
  expect(world.name).toStrictEqual({ en: 'Overworld', ru: 'Обычный мир' });
  const base = { stateId: first.stateId, worldId: world.id, actorCookie, adminCookie };
  await publish(context, { ...base, geometry: auroraGeometry(16), change: 'INITIAL' });
  await publish(context, {
    stateId: second.stateId,
    worldId: world.id,
    actorCookie: otherCookie,
    adminCookie,
    geometry: rectangle(16, -16, 32, 16),
    change: 'INITIAL',
  });
  const initialSnapshot = await snapshot(context, world.id);
  await context.waitUntil(
    async () =>
      (await paperLog(context)).includes(
        `Spatial snapshot installed world ${world.id} revision ${initialSnapshot.version}`,
      ),
    'initial complete spatial snapshot',
  );
  await consoleEvidence(
    context,
    'execute in minecraft:overworld run forceload add -144 -16 47 15',
    'Marked 24 chunks',
  );
  await consoleEvidence(
    context,
    'execute in minecraft:overworld run fill -144 300 -16 47 300 15 minecraft:smooth_stone',
    'Successfully filled 6144 block(s)',
  );
  const tiles = await verifyTiles(context, world.id);
  await verifyMapUi({
    browser: context.browser,
    db: context.db,
    origin: context.origin,
    run: context.run,
    worldId: world.id,
  });
  const firstSnapshot = await snapshot(context, world.id);
  await context.waitUntil(
    async () =>
      (await paperLog(context)).includes(
        `Spatial snapshot installed world ${world.id} revision ${firstSnapshot.version}`,
      ),
    'complete snapshot after browser ratification',
  );
  await teleport(context, -64, 'Map acceptance');
  await whereami(context, 'Map acceptance');
  await teleport(context, -8, 'Wilderness');
  const ordinary = await whereami(context, 'Wilderness');
  expect(ordinary).not.toContain('Spatial snapshot');
  await teleport(context, 8, 'Aurora');
  await whereami(context, 'Aurora');
  await teleport(context, 5, 'Wilderness');
  await whereami(context, 'Wilderness');
  await teleport(context, 8, 'Aurora');
  await teleport(context, 15.5);
  await whereami(context, 'Aurora');
  const boundaryTitles = context.player.titles.length;
  for (const x of [15.99, 16.01, 15.99, 16.01]) {
    context.player.client.move(x, 301, 0.5);
    await Bun.sleep(100);
  }
  expect(context.player.titles).toHaveLength(boundaryTitles);
  context.player.client.move(16, 301, 0.5);
  await context.player.waitFor(
    () => context.player.titles.slice(boundaryTitles).join(' ').includes('Wilderness'),
    'deterministic shared-edge Wilderness',
  );
  const loriaTitles = context.player.titles.length;
  for (const x of [16.2, 16.4, 16.6, 16.8, 17]) {
    context.player.client.move(x, 301, 0.5);
    await Bun.sleep(100);
  }
  const physical = await whereami(context, 'X ');
  await Bun.write(
    `${context.run}/movement-evidence.json`,
    JSON.stringify(
      {
        physical,
        positions: context.player.positions,
        titles: context.player.titles,
      },
      null,
      2,
    ),
  );
  await context.player.waitFor(
    () => context.player.titles.slice(loriaTitles).join(' ').includes('Loria'),
    'real movement into Loria',
  );
  await whereami(context, 'Loria');
  await teleport(context, 40, 'Wilderness');
  await whereami(context, 'Wilderness');
  await verifyVehicleAndDimensions(context);
  const sameStateTitles = context.player.titles.length;
  await teleport(context, 14);
  await Bun.sleep(600);
  expect(context.player.titles).toHaveLength(sameStateTitles);
  await consoleEvidence(context, `op ${context.username}`, 'Made ');
  await whereami(context, 'Aurora', firstSnapshot.version);
  const hotTitles = context.player.titles.length;
  await updateTerritoryThroughVega({
    browser: context.browser,
    origin: context.origin,
    run: context.run,
    stateId: first.stateId,
    actorCookie,
    adminCookie,
    geometry: auroraGeometry(12),
    change: 'REDUCE',
  });
  const secondSnapshot = await snapshot(context, world.id);
  expect(secondSnapshot.version).toBeGreaterThan(firstSnapshot.version);
  await context.player.waitFor(
    () => context.player.titles.slice(hotTitles).join(' ').includes('Wilderness'),
    'stationary player reclassified after R2',
  );
  await whereami(context, 'Wilderness', secondSnapshot.version);
  expect(context.paperPid()).toBe(originalPid);
  await teleport(context, 10, 'Aurora');
  await teleport(context, 14, 'Wilderness');
  context.spatialUnavailable(true);
  try {
    const logOffset = (await paperLog(context)).length;
    await context.waitUntil(
      async () =>
        (await paperLog(context)).slice(logOffset).includes('Spatial reconciliation unavailable'),
      'spatial API outage observed',
    );
    await teleport(context, 13);
    await whereami(context, 'Wilderness', secondSnapshot.version);
    await updateTerritoryThroughVega({
      browser: context.browser,
      origin: context.origin,
      run: context.run,
      stateId: first.stateId,
      actorCookie,
      adminCookie,
      geometry: auroraGeometry(14),
      change: 'EXPAND',
    });
    const thirdSnapshot = await snapshot(context, world.id);
    await Bun.sleep(31_000);
    await whereami(context, 'Last verified', secondSnapshot.version);
    expect(context.player.disconnected).toBe(false);
    context.spatialUnavailable(false);
    const recoveryTitles = context.player.titles.length;
    await context.waitUntil(
      async () =>
        (await paperLog(context)).includes(
          `Spatial snapshot installed world ${world.id} revision ${thirdSnapshot.version}`,
        ),
      'reconciliation after outage',
    );
    await context.player.waitFor(
      () => context.player.titles.slice(recoveryTitles).join(' ').includes('Aurora'),
      'stationary player jurisdiction after recovery',
    );
    await whereami(context, 'Aurora', thirdSnapshot.version);
    expect(context.paperPid()).toBe(originalPid);
    const metadataLogOffset = (await paperLog(context)).length;
    await addTerritorialAuthority(context.db, {
      ...first,
      name: { en: 'Aurora renamed', ru: 'Аврора обновлённая' },
    });
    const renamed = await snapshot(context, world.id);
    expect(renamed.version).toBe(thirdSnapshot.version);
    expect(renamed.integrity).not.toBe(thirdSnapshot.integrity);
    await context.waitUntil(
      async () =>
        (await paperLog(context))
          .slice(metadataLogOffset)
          .includes(`Spatial snapshot installed world ${world.id} revision ${renamed.version}`),
      'official name refresh with unchanged geometry version',
    );
    await whereami(context, 'Aurora renamed', renamed.version);
    const result = {
      status: 'passed',
      nativeProtocol: 777,
      paper: '26.3-223',
      worldId: world.id,
      paperWorldId,
      r1: firstSnapshot.version,
      r2: secondSnapshot.version,
      recovered: thirdSnapshot.version,
      tiles,
      scenarios: [
        'Wilderness → Aurora → hole → Aurora',
        'ordinary movement and shared edge',
        'vanilla powered-minecart movement across state borders',
        'Nether/End commons and Overworld return',
        'automatic squaremap background update',
        'Loria and Wilderness',
        'no debug leak to ordinary player',
        'browser-drawn territory recognized by Paper',
        'R2 through Vega without restart and stationary reclassification',
        'spatial API outage retains verified snapshot with stale label',
        'reconciliation installs missed revision',
        'official localized name refresh by integrity without geometry rewrite',
      ],
    };
    await Bun.write(`${context.run}/spatial-result.json`, JSON.stringify(result, null, 2));
    // oxlint-disable-next-line no-console -- Emit a sanitized acceptance-stage marker without private client messages.
    console.info(
      'Native 26.3 territories, real squaremap tiles, movement, hot update and spatial reconciliation passed.',
    );
    return result;
  } finally {
    context.spatialUnavailable(false);
    await context.console(`deop ${context.username}`);
  }
}
export { verifyTerritoryRuntime };
