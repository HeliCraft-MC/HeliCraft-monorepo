import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { json } from '../platform/routes';
import { HTTP, DomainError } from '../errors';
import { TerritoryHistorySchema, PublicTerritorySummarySchema } from './contracts';
import { SpatialSnapshotService } from './snapshots';
import { SpatialHistoryService } from './history';

const MAX_PAGE = 100_000;
async function catalog(
  db: Database['db'] | undefined,
  worldId: string,
): Promise<Awaited<ReturnType<SpatialSnapshotService['catalog']>>> {
  if (!db) {
    throw new DomainError(
      HTTP.unavailable,
      'SPATIAL_UNAVAILABLE',
      'Spatial service is unavailable',
    );
  }
  return await new SpatialSnapshotService(db).catalog(worldId);
}
function spatialHistoryRoutes(db: Database['db'] | undefined): OpenAPIHono {
  const app = new OpenAPIHono();
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/spatial/worlds/{worldId}/states/{stateId}/history',
      operationId: 'getTerritoryHistory',
      request: {
        params: z.object({ worldId: z.uuid(), stateId: z.uuid() }),
        query: z.object({ page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1) }),
      },
      responses: { 200: json(TerritoryHistorySchema) },
    }),
    async (context) => {
      if (!db) {
        throw new DomainError(
          HTTP.unavailable,
          'SPATIAL_UNAVAILABLE',
          'Spatial service is unavailable',
        );
      }
      const { worldId, stateId } = context.req.valid('param');
      return context.json(
        await new SpatialHistoryService(db).list(worldId, stateId, context.req.valid('query').page),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/spatial/worlds/{id}/states',
      operationId: 'getPoliticalMapCatalog',
      request: { params: z.object({ id: z.uuid() }) },
      responses: {
        200: json(z.object({ items: z.array(PublicTerritorySummarySchema) })),
      },
    }),
    async (context) =>
      context.json({ items: await catalog(db, context.req.valid('param').id) }, HTTP.ok),
  );
  return app;
}
export { spatialHistoryRoutes };
