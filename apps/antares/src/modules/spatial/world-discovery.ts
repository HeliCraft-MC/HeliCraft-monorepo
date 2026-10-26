import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import type { Transaction } from '../permissions/transaction';
import { spatialWorlds, spatialWorldEvents } from '../../db/spatial-schema';
import { createText } from '../localized-content/service';
import type { ServiceActor } from '../minecraft/contracts';
import { DomainError, HTTP } from '../errors';

const OVERWORLD = 'minecraft:overworld';
const TILE_KEY = 'minecraft_overworld';
const DEFAULT_MAX_ZOOM = 3;
const DEFAULT_EXTRA_ZOOM = 2;
const LOGICAL_KEY_LENGTH = 40;
async function retirePrevious(transaction: Transaction, actor: ServiceActor): Promise<void> {
  const [previous] = await transaction
    .select()
    .from(spatialWorlds)
    .where(
      and(
        eq(spatialWorlds.backendId, actor.backendId),
        eq(spatialWorlds.tileKey, TILE_KEY),
        eq(spatialWorlds.status, 'ACTIVE'),
      ),
    )
    .for('update');
  if (previous) {
    if (previous.dimension !== OVERWORLD) {
      throw new DomainError(
        HTTP.conflict,
        'SPATIAL_WORLD_IDENTITY',
        'Overworld tile source is assigned to another dimension',
      );
    }
    await transaction
      .update(spatialWorlds)
      .set({ status: 'RETIRED', version: previous.version + 1 })
      .where(eq(spatialWorlds.id, previous.id));
    await transaction
      .insert(spatialWorldEvents)
      .values({ worldId: previous.id, serviceId: actor.id, action: 'RETIRED' });
  }
}
async function createWorld(
  transaction: Transaction,
  actor: ServiceActor,
  paperWorldId: string,
): Promise<void> {
  const logicalKey = `overworld-${createHash('sha256').update(`${actor.backendId}:${paperWorldId}`).digest('hex').slice(0, LOGICAL_KEY_LENGTH)}`;
  const [created] = await transaction
    .insert(spatialWorlds)
    .values({
      logicalKey,
      backendId: actor.backendId,
      paperWorldId,
      dimension: OVERWORLD,
      nameTextId: await createText(transaction, { ru: 'Обычный мир', en: 'Overworld' }),
      tileKey: TILE_KEY,
      maxZoom: DEFAULT_MAX_ZOOM,
      extraZoom: DEFAULT_EXTRA_ZOOM,
    })
    .returning({ id: spatialWorlds.id });
  if (!created) {
    throw new Error('Automatic Overworld registration failed');
  }
  await transaction
    .insert(spatialWorldEvents)
    .values({ worldId: created.id, serviceId: actor.id, action: 'REGISTERED' });
}
async function discoverOverworld(
  db: Database['db'],
  actor: ServiceActor,
  paperWorldId: string,
): Promise<void> {
  if (actor.role !== 'DENEB') {
    throw new DomainError(HTTP.forbidden, 'SERVICE_FORBIDDEN', 'Only Deneb can discover its world');
  }
  await db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`spatial-world:${actor.backendId}`}, 0))`,
    );
    const [existing] = await transaction
      .select()
      .from(spatialWorlds)
      .where(
        and(
          eq(spatialWorlds.backendId, actor.backendId),
          eq(spatialWorlds.paperWorldId, paperWorldId),
        ),
      );
    if (existing) {
      if (existing.dimension !== OVERWORLD) {
        throw new DomainError(
          HTTP.conflict,
          'SPATIAL_WORLD_IDENTITY',
          'Paper world dimension does not match its registered identity',
        );
      }
      // Retired UUIDs never return to service, including reports from an obsolete backend process.
      return;
    }
    await retirePrevious(transaction, actor);
    await createWorld(transaction, actor, paperWorldId);
  });
}
export { discoverOverworld };
