// oxlint-disable import/max-dependencies, init-declarations, max-lines, max-lines-per-function -- Lifecycle fixtures initialize in beforeAll; spatial acceptance composes the real immutable Governance and PostGIS services.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { stateOfficeHolders } from '../src/db/schema';
import sharedFixtures from '../../../tests/fixtures/spatial.json';
import { TerritoryGeometrySchema } from '../src/modules/spatial/contracts';
import { localizedTextValues } from '../src/db/state-schema';
import { monetaryVotes } from '../src/db/monetary-schema';
import { VotingService } from '../src/modules/voting/service';
import { MonetaryReviewService } from '../src/modules/monetary/review';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createDatabase } from '../src/db';
import type { Database } from '../src/db';
import {
  spatialWorlds,
  activeTerritories,
  territoryDrafts,
  territoryRevisions,
  territorialEvents,
} from '../src/db/spatial-schema';
import { monetaryFixture } from './monetary-fixture';
import { addTerritorialAuthority, rectangle } from './spatial-fixture';
import { TerritoryDraftService } from '../src/modules/spatial/drafts';
import { SpatialWorldService } from '../src/modules/spatial/worlds';
import { SpatialSnapshotService } from '../src/modules/spatial/snapshots';
import { SpatialHistoryService } from '../src/modules/spatial/history';
import { TerritorialRatificationService } from '../src/modules/spatial/ratification';
import { analyzeGeometry } from '../src/modules/spatial/geometry';
import type {
  TerritoryGeometry,
  TerritoryDraftInput,
  SpatialAnalysis,
} from '../src/modules/spatial/contracts';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';

let container: StartedPostgreSqlContainer;
let database: Database;
let first: Awaited<ReturnType<typeof monetaryFixture>>;
let second: Awaited<ReturnType<typeof monetaryFixture>>;
let worldId: string;
let otherWorldId: string;
function input(geometry: TerritoryGeometry): TerritoryDraftInput {
  return {
    worldId,
    geometry,
    reason: { en: 'A real initial territorial proposal' },
    change: 'INITIAL',
  };
}
async function preview(
  geometry: TerritoryGeometry,
  stateId = first.stateId,
  selectedWorld = worldId,
): Promise<SpatialAnalysis> {
  return await database.db.transaction(
    async (transaction) =>
      await analyzeGeometry(transaction, { stateId, worldId: selectedWorld, geometry }),
  );
}
describe('PostGIS territorial authority and history', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft_spatial_test')
      .start();
    database = createDatabase(container.getConnectionUri());
    await migrate(database.db, { migrationsFolder: './drizzle' });
    first = await monetaryFixture(database.db, 'SA');
    second = await monetaryFixture(database.db, 'SB');
    const worlds = new SpatialWorldService(database.db);
    const world = await worlds.register(first.adminId, {
      logicalKey: 'disposable-spatial',
      backendId: 'deneb',
      paperWorldId: crypto.randomUUID(),
      dimension: 'minecraft:overworld',
      name: { en: 'Disposable world' },
      tileKey: 'minecraft_overworld',
      maxZoom: 3,
      extraZoom: 2,
    });
    worldId = world.id;
    const other = await worlds.register(first.adminId, {
      logicalKey: 'other-spatial',
      backendId: 'other',
      paperWorldId: crypto.randomUUID(),
      dimension: 'minecraft:overworld',
      name: { en: 'Another world' },
      tileKey: 'minecraft_overworld',
      maxZoom: 3,
      extraZoom: 2,
    });
    otherWorldId = other.id;
  });
  afterAll(async () => {
    await database?.pool.end();
    await container?.stop();
  });
  it('requires an explicit Governance reform without changing existing state foundation', async () => {
    const drafts = new TerritoryDraftService(database.db);
    await expect(
      drafts.create(
        first.stateId,
        { id: first.founderId, admin: false },
        input(rectangle(-64, -64, 64, 64)),
      ),
    ).rejects.toThrow('CHANGE_TERRITORY');
    await addTerritorialAuthority(database.db, first);
    await addTerritorialAuthority(database.db, second);
    await expect(
      drafts.create(
        first.stateId,
        { id: second.founderId, admin: false },
        input(rectangle(-64, -64, 64, 64)),
      ),
    ).rejects.toThrow();
  });
  it('validates holes, MultiPolygon, negative coordinates, degeneracy and self-intersection with PostGIS', async () => {
    const cases: { geometry: TerritoryGeometry; valid: boolean; area?: number }[] = [
      { geometry: rectangle(-64, -64, 64, 64), valid: true, area: 16_384 },
      {
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [64, 0],
              [64, 64],
              [0, 64],
              [0, 0],
            ],
            [
              [16, 16],
              [16, 32],
              [32, 32],
              [32, 16],
              [16, 16],
            ],
          ],
        },
        valid: true,
        area: 3840,
      },
      {
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [16, 0],
                [16, 16],
                [0, 16],
                [0, 0],
              ],
            ],
            [
              [
                [-32, -32],
                [-16, -32],
                [-16, -16],
                [-32, -16],
                [-32, -32],
              ],
            ],
          ],
        },
        valid: true,
        area: 512,
      },
      {
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [64, 64],
              [0, 64],
              [64, 0],
              [0, 0],
            ],
          ],
        },
        valid: false,
      },
      {
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [16, 0],
              [32, 0],
              [0, 0],
            ],
          ],
        },
        valid: false,
      },
      { geometry: rectangle(0, 0, 100_000, 100_000), valid: false },
    ];
    for (const fixture of cases) {
      // oxlint-disable-next-line no-await-in-loop -- Exercise each independent geometry on a real PostGIS connection.
      const result = await preview(fixture.geometry);
      expect(result.valid).toBe(fixture.valid);
      if (fixture.area !== undefined) {
        expect(result.area).toBe(fixture.area);
      }
    }
  });
  it('seals the exact optimistic draft, runs the existing state decision, then requires independent administrative ratification', async () => {
    const drafts = new TerritoryDraftService(database.db);
    const actor = { id: first.founderId, admin: false };
    const draft = await drafts.create(first.stateId, actor, input(rectangle(-64, -64, 64, 64)));
    const saved = await drafts.save(draft.id, actor, {
      ...input(rectangle(-64, -64, 64, 64)),
      version: draft.version,
    });
    await expect(
      drafts.save(draft.id, actor, { ...input(rectangle(0, 0, 64, 64)), version: draft.version }),
    ).rejects.toThrow('Draft changed');
    const directiveId = await drafts.submit(draft.id, actor, saved.version);
    const [storedDraft] = await database.db
      .select({ reasonTextId: territoryDrafts.reasonTextId })
      .from(territoryDrafts)
      .where(eq(territoryDrafts.id, draft.id));
    if (!storedDraft) {
      throw new Error('No sealed reason');
    }
    await expect(
      database.db.insert(localizedTextValues).values({
        textId: storedDraft.reasonTextId,
        locale: 'ru',
        value: 'An injected translation after sealing',
      }),
    ).rejects.toThrow();
    expect(await drafts.submit(draft.id, actor, saved.version)).toBe(directiveId);
    expect(
      (await new MonetaryDirectiveService(database.db).detail(directiveId, actor)).status,
    ).toBe('APPLIED');
    expect(await database.db.select().from(activeTerritories)).toHaveLength(0);
    expect(
      (await new SpatialHistoryService(database.db).list(worldId, first.stateId, 1)).items,
    ).toHaveLength(0);
    await expect(
      database.db
        .update(territoryDrafts)
        .set({ geometry: rectangle(0, 0, 1, 1) })
        .where(eq(territoryDrafts.id, draft.id)),
    ).rejects.toThrow();
    const reviews = new TerritorialRatificationService(database.db);
    const application = (await reviews.list(first.adminId)).find(
      (item) => item.draft.id === draft.id,
    );
    if (!application) {
      throw new Error('Territorial review missing');
    }
    await expect(
      reviews.review(application.id, first.citizenId, {
        decision: 'APPROVE',
        reason: 'No authority',
      }),
    ).rejects.toThrow();
    const revision = await reviews.review(application.id, first.adminId, {
      decision: 'APPROVE',
      reason: 'Geometry and legal evidence verified',
    });
    expect(
      await reviews.review(application.id, first.adminId, {
        decision: 'APPROVE',
        reason: 'Geometry and legal evidence verified',
      }),
    ).toBe(revision);
    expect(await database.db.select().from(territoryRevisions)).toHaveLength(1);
    expect(await database.db.select().from(territorialEvents)).toHaveLength(1);
    const snapshots = new SpatialSnapshotService(database.db);
    const snapshot = await snapshots.snapshot(worldId);
    expect(snapshot.version).toBe(1);
    const catalog = await snapshots.catalog(worldId);
    expect(catalog).toHaveLength(1);
    expect(catalog[0]).not.toHaveProperty('geometry');
    expect(catalog[0]?.stateId).toBe(first.stateId);
    expect(
      (
        await snapshots.snapshot(worldId, undefined, {
          minX: 10_000,
          minZ: 10_000,
          maxX: 10_010,
          maxZ: 10_010,
        })
      ).territories,
    ).toHaveLength(0);
    expect(
      (await snapshots.snapshot(worldId, undefined, { minX: -1, minZ: -1, maxX: 1, maxZ: 1 }))
        .territories,
    ).toHaveLength(1);
    expect(snapshot.territories[0]?.revisionId).toBe(revision);
    const history = await new SpatialHistoryService(database.db).list(worldId, first.stateId, 1);
    expect(history.items).toHaveLength(1);
    expect(history.items[0]).toMatchObject({
      id: revision,
      directiveId,
      worldVersion: snapshot.version,
      geometry: saved.geometry,
      reason: saved.reason,
      ratificationReason: 'Geometry and legal evidence verified',
    });
    expect((await drafts.detail(draft.id, actor)).application).toMatchObject({
      status: 'APPROVED',
      revisionId: revision,
    });
    expect(
      (await new SpatialHistoryService(database.db).list(otherWorldId, first.stateId, 1)).items,
    ).toHaveLength(0);
    expect(await snapshots.lookup(worldId, 0, 0)).toBe(first.stateId);
    expect(await snapshots.lookup(worldId, 64, 0)).toBeNull();
    expect(await snapshots.lookup(otherWorldId, 0, 0)).toBeNull();
    await expect(database.db.delete(territoryRevisions)).rejects.toThrow();
  });
  it('permits adjacent borders but rejects real overlapping area and isolates worlds', async () => {
    expect((await preview(rectangle(64, -64, 128, 64), second.stateId)).conflicts).toHaveLength(0);
    expect((await preview(rectangle(63, -64, 128, 64), second.stateId)).conflicts[0]?.area).toBe(
      128,
    );
    expect(
      (await preview(rectangle(0, 0, 32, 32), second.stateId, otherWorldId)).conflicts,
    ).toHaveLength(0);
  });
  it('serializes competing ratifications and protects SQL-level state/world consistency', async () => {
    const drafts = new TerritoryDraftService(database.db);
    const reviews = new TerritorialRatificationService(database.db);
    const current = (
      await new SpatialSnapshotService(database.db).snapshot(worldId)
    ).territories.find((item) => item.stateId === first.stateId);
    if (!current) {
      throw new Error('Current territory missing');
    }
    const disputed = rectangle(256, 256, 320, 320);
    if (disputed.type !== 'Polygon') {
      throw new Error('Polygon fixture expected');
    }
    const geometry: TerritoryGeometry = {
      type: 'MultiPolygon',
      coordinates: [
        ...(current.geometry.type === 'Polygon'
          ? [current.geometry.coordinates]
          : current.geometry.coordinates),
        disputed.coordinates,
      ],
    };
    const firstActor = { id: first.founderId, admin: false };
    const secondActor = { id: second.founderId, admin: false };
    const firstDraft = await drafts.create(first.stateId, firstActor, {
      ...input(geometry),
      change: 'RESHAPE',
    });
    const secondDraft = await drafts.create(second.stateId, secondActor, input(disputed));
    await drafts.submit(firstDraft.id, firstActor, firstDraft.version);
    await drafts.submit(secondDraft.id, secondActor, secondDraft.version);
    const queue = await reviews.list(first.adminId);
    const appA = queue.find((item) => item.draft.id === firstDraft.id);
    const appB = queue.find((item) => item.draft.id === secondDraft.id);
    if (!appA || !appB) {
      throw new Error('Competing applications missing');
    }
    const results = await Promise.allSettled([
      reviews.review(appA.id, first.adminId, { decision: 'APPROVE', reason: 'Competing state A' }),
      reviews.review(appB.id, second.adminId, { decision: 'APPROVE', reason: 'Competing state B' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect((await new SpatialSnapshotService(database.db).snapshot(worldId)).version).toBe(2);
    await expect(
      database.db.update(activeTerritories).set({ worldId: otherWorldId }),
    ).rejects.toThrow();
    await expect(
      database.db
        .update(spatialWorlds)
        .set({ paperWorldId: crypto.randomUUID() })
        .where(eq(spatialWorlds.id, worldId)),
    ).rejects.toThrow();
  });
  it('rejects stale Governance before ratification and retains a reasoned rejection', async () => {
    const drafts = new TerritoryDraftService(database.db);
    const actor = { id: first.founderId, admin: false };
    const current = (
      await new SpatialSnapshotService(database.db).snapshot(worldId)
    ).territories.find((item) => item.stateId === first.stateId);
    if (!current) {
      throw new Error('Current territory missing');
    }
    const draft = await drafts.create(first.stateId, actor, {
      ...input(current.geometry),
      change: 'RESHAPE',
    });
    await drafts.submit(draft.id, actor, draft.version);
    const reviews = new TerritorialRatificationService(database.db);
    const application = (await reviews.list(first.adminId)).find(
      (item) => item.draft.id === draft.id,
    );
    if (!application) {
      throw new Error('Application missing');
    }
    await addTerritorialAuthority(database.db, first, 'COMBINED');
    await expect(
      reviews.review(application.id, first.adminId, {
        decision: 'APPROVE',
        reason: 'Stale evidence',
      }),
    ).rejects.toThrow('current successful');
    await reviews.review(application.id, first.adminId, {
      decision: 'REJECT',
      reason: 'Governance changed; resubmit through the current procedure',
    });
    expect((await reviews.detail(application.id, first.adminId)).status).toBe('REJECTED');
    expect((await drafts.detail(draft.id, actor)).application).toMatchObject({
      status: 'REJECTED',
      reason: 'Governance changed; resubmit through the current procedure',
      revisionId: null,
    });
    const history = await new SpatialHistoryService(database.db).list(worldId, first.stateId, 1);
    expect(history.items.some((item) => item.applicationId === application.id)).toBe(false);
  });
  it('uses generic Voting and combined office approval and exposes exact geometry to eligible voters', async () => {
    const drafts = new TerritoryDraftService(database.db);
    const actor = { id: first.founderId, admin: false };
    const current = (
      await new SpatialSnapshotService(database.db).snapshot(worldId)
    ).territories.find((item) => item.stateId === first.stateId);
    if (!current) {
      throw new Error('Current territory missing');
    }
    const draft = await drafts.create(first.stateId, actor, {
      ...input(current.geometry),
      change: 'RESHAPE',
    });
    const directiveId = await drafts.submit(draft.id, actor, draft.version);
    const decisions = new MonetaryDirectiveService(database.db);
    await expect(decisions.apply(directiveId, actor)).rejects.toThrow();
    await decisions.approve(directiveId, actor, first.officeId);
    await expect(decisions.apply(directiveId, actor)).rejects.toThrow();
    const [link] = await database.db
      .select()
      .from(monetaryVotes)
      .where(eq(monetaryVotes.directiveId, directiveId));
    if (!link) {
      throw new Error('Shared Voting link missing');
    }
    const voting = new VotingService(database.db);
    await voting.cast(link.votingId, first.founderId, {
      choices: [link.approvalOptionId],
      abstain: false,
    });
    await voting.cast(link.votingId, first.citizenId, {
      choices: [link.approvalOptionId],
      abstain: false,
    });
    const read = await new MonetaryReviewService(database.db).votingPayload(link.votingId, {
      id: first.citizenId,
      admin: false,
    });
    expect(read.territorialDisplay?.draft.geometry).toEqual(current.geometry);
    await expect(
      new MonetaryReviewService(database.db).votingPayload(link.votingId, {
        id: second.founderId,
        admin: false,
      }),
    ).rejects.toThrow();
    await decisions.apply(directiveId, actor);
    const reviews = new TerritorialRatificationService(database.db);
    const application = (await reviews.list(first.adminId)).find(
      (item) => item.draft.id === draft.id,
    );
    if (!application) {
      throw new Error('Combined decision did not reach administrative review');
    }
    await reviews.review(application.id, first.adminId, {
      decision: 'APPROVE',
      reason: 'Combined procedure and immutable geometry verified',
    });
    expect((await new SpatialSnapshotService(database.db).snapshot(worldId)).version).toBe(3);
  });
  it('invalidates an executed territorial proposal after office revocation and reappointment', async () => {
    const fixture = await monetaryFixture(database.db, 'SC');
    await addTerritorialAuthority(database.db, fixture);
    const actor = { id: fixture.founderId, admin: false };
    const drafts = new TerritoryDraftService(database.db);
    const draft = await drafts.create(
      fixture.stateId,
      actor,
      input(rectangle(12_000, 12_000, 12_010, 12_010)),
    );
    await drafts.submit(draft.id, actor, draft.version);
    const reviews = new TerritorialRatificationService(database.db);
    const application = (await reviews.list(fixture.adminId)).find(
      (item) => item.draft.id === draft.id,
    );
    if (!application) {
      throw new Error('Application missing');
    }
    const before = await new SpatialSnapshotService(database.db).snapshot(worldId);
    await database.db.transaction(async (transaction) => {
      await transaction
        .update(stateOfficeHolders)
        .set({ until: sql`clock_timestamp()` })
        .where(
          and(eq(stateOfficeHolders.officeId, fixture.officeId), isNull(stateOfficeHolders.until)),
        );
      await transaction.insert(stateOfficeHolders).values({
        officeId: fixture.officeId,
        userId: fixture.founderId,
        since: sql`clock_timestamp()`,
      });
    });
    await expect(
      reviews.review(application.id, fixture.adminId, {
        decision: 'APPROVE',
        reason: 'A new term cannot reuse the old mandate',
      }),
    ).rejects.toThrow('current successful');
    expect((await new SpatialSnapshotService(database.db).snapshot(worldId)).integrity).toBe(
      before.integrity,
    );
  });
  it('ratifies an independent state enclave inside another state hole with identical strict edges', async () => {
    const outer = await monetaryFixture(database.db, 'ECA');
    const enclave = await monetaryFixture(database.db, 'ECB');
    const world = await new SpatialWorldService(database.db).register(outer.adminId, {
      logicalKey: 'sovereign-enclave',
      backendId: 'deneb',
      paperWorldId: crypto.randomUUID(),
      dimension: 'minecraft:overworld',
      name: { en: 'Independent enclave fixture' },
      tileKey: 'minecraft_enclave_fixture',
      maxZoom: 3,
      extraZoom: 2,
    });
    const fixture = sharedFixtures.find(
      (item) => item.name === 'polygon with an independent enclave',
    );
    if (!fixture) {
      throw new Error('Shared enclave fixture missing');
    }
    const geometry = TerritoryGeometrySchema.parse(fixture.geometry);
    const commands = [
      { fixture: outer, geometry },
      { fixture: enclave, geometry: rectangle(16, 16, 32, 32) },
    ];
    for (const command of commands) {
      // oxlint-disable-next-line no-await-in-loop -- Each state completes its real procedure before the next enclave publication.
      await addTerritorialAuthority(database.db, command.fixture);
      const actor = { id: command.fixture.founderId, admin: false };
      const drafts = new TerritoryDraftService(database.db);
      // oxlint-disable-next-line no-await-in-loop -- Draft, Governance and ratification are sequential legal transitions.
      const draft = await drafts.create(command.fixture.stateId, actor, {
        ...input(command.geometry),
        worldId: world.id,
      });
      // oxlint-disable-next-line no-await-in-loop -- Seal and execute the current state's immutable proposal.
      await drafts.submit(draft.id, actor, draft.version);
      const reviews = new TerritorialRatificationService(database.db);
      // oxlint-disable-next-line no-await-in-loop -- Find the application produced by that exact state decision.
      const application = (await reviews.list(command.fixture.adminId)).find(
        (item) => item.draft.id === draft.id,
      );
      if (!application) {
        throw new Error('Enclave application missing');
      }
      // oxlint-disable-next-line no-await-in-loop -- The administrator independently ratifies each exact geometry.
      await reviews.review(application.id, command.fixture.adminId, {
        decision: 'APPROVE',
        reason: 'Shared enclave boundary verified',
      });
    }
    const snapshots = new SpatialSnapshotService(database.db);
    expect((await snapshots.snapshot(world.id)).territories).toHaveLength(2);
    expect(await snapshots.lookup(world.id, 8, 24)).toBe(outer.stateId);
    expect(await snapshots.lookup(world.id, 24, 24)).toBe(enclave.stateId);
    expect(await snapshots.lookup(world.id, 16, 24)).toBeNull();
    expect(await snapshots.lookup(world.id, 32, 24)).toBeNull();
  });
  it('refreshes official state labels through snapshot integrity without rewriting territorial history', async () => {
    const service = new SpatialSnapshotService(database.db);
    const before = await service.snapshot(worldId);
    const previous = before.territories.find((item) => item.stateId === first.stateId);
    await addTerritorialAuthority(
      database.db,
      { ...first, name: { en: 'Updated official state name', ru: 'Обновлённое название' } },
      'COMBINED',
    );
    const after = await service.snapshot(worldId);
    const current = after.territories.find((item) => item.stateId === first.stateId);
    expect(after.version).toBe(before.version);
    expect(after.integrity).not.toBe(before.integrity);
    expect(current?.revisionId).toBe(previous?.revisionId);
    expect(current?.geometry).toEqual(previous?.geometry);
    expect(current?.name).toEqual({
      en: 'Updated official state name',
      ru: 'Обновлённое название',
    });
  });
});
