import { eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { spatialWorlds } from '../../db/spatial-schema';
import { adminAuditLog } from '../../db/core-schema';
import { authorizeMutation } from '../permissions/transaction';
import { createText } from '../localized-content/service';
import { resolveText } from '../localized-content/contracts';
import { DomainError, HTTP } from '../errors';
import { SpatialWorldInputSchema } from './contracts';
import type { SpatialWorldInput, SpatialWorld } from './contracts';
import { worldView } from './store';

class SpatialWorldService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async list(): Promise<SpatialWorld[]> {
    return await this.db.transaction(async (transaction) => {
      const worlds = await transaction
        .select()
        .from(spatialWorlds)
        .where(eq(spatialWorlds.status, 'ACTIVE'))
        .orderBy(spatialWorlds.logicalKey);
      const result: SpatialWorld[] = [];
      for (const world of worlds) {
        // oxlint-disable-next-line no-await-in-loop -- Hydrate localized world names on one transaction connection.
        result.push(await worldView(transaction, world));
      }
      return result;
    });
  }
  public async register(actorId: string, raw: SpatialWorldInput): Promise<SpatialWorld> {
    const input = SpatialWorldInputSchema.parse(raw);
    if (!resolveText(input.name, 'en').value) {
      throw new DomainError(HTTP.badRequest, 'SPATIAL_WORLD_NAME', 'World name is required');
    }
    return await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'states.manage');
      const [existing] = await transaction
        .select()
        .from(spatialWorlds)
        .where(eq(spatialWorlds.logicalKey, input.logicalKey));
      if (existing) {
        if (
          existing.backendId !== input.backendId ||
          existing.paperWorldId !== input.paperWorldId ||
          existing.dimension !== input.dimension ||
          existing.tileKey !== input.tileKey ||
          existing.maxZoom !== input.maxZoom ||
          existing.extraZoom !== input.extraZoom ||
          existing.status !== 'ACTIVE'
        ) {
          throw new DomainError(
            HTTP.conflict,
            'SPATIAL_WORLD_IDENTITY',
            'A logical world cannot be rebound to a different Paper world',
          );
        }
        return await worldView(transaction, existing);
      }
      const { name, ...identity } = input;
      const [world] = await transaction
        .insert(spatialWorlds)
        .values({ ...identity, nameTextId: await createText(transaction, name) })
        .returning();
      if (!world) {
        throw new Error('World registration failed');
      }
      await transaction.insert(adminAuditLog).values({
        actorId,
        action: 'spatial.world.registered',
        targetType: 'SPATIAL_WORLD',
        targetId: world.id,
        metadata: { logicalKey: world.logicalKey, backendId: world.backendId },
      });
      return await worldView(transaction, world);
    });
  }
  public async retire(id: string, actorId: string, reason: string): Promise<void> {
    if (!reason.trim()) {
      throw new DomainError(HTTP.badRequest, 'REASON_REQUIRED', 'Explain world retirement');
    }
    await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'states.manage');
      const [world] = await transaction
        .select()
        .from(spatialWorlds)
        .where(eq(spatialWorlds.id, id))
        .for('update');
      if (!world) {
        throw new DomainError(HTTP.notFound, 'SPATIAL_WORLD_UNAVAILABLE', 'World not found');
      }
      if (world.status === 'RETIRED') {
        return;
      }
      await transaction
        .update(spatialWorlds)
        .set({ status: 'RETIRED', version: world.version + 1 })
        .where(eq(spatialWorlds.id, id));
      await transaction.insert(adminAuditLog).values({
        actorId,
        action: 'spatial.world.retired',
        targetType: 'SPATIAL_WORLD',
        targetId: id,
        metadata: { reason: reason.trim() },
      });
    });
  }
}
export { SpatialWorldService };
