import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { serviceActor } from '../minecraft/security';
import type { ServiceActor } from '../minecraft/contracts';
import { canonicalJson } from '../states/configuration-hash';
import { SpatialWorldService } from './worlds';
import { SpatialSnapshotService } from './snapshots';

const Identity = z.object({ worldId: z.uuid(), paperWorldId: z.uuid() }).strict();
const ErrorSchema = z.object({ message: z.string(), code: z.string().optional() });
const Errors = {
  400: json(ErrorSchema),
  401: json(ErrorSchema),
  403: json(ErrorSchema),
  404: json(ErrorSchema),
  503: json(ErrorSchema),
};
const MAX_WORLD_KEY_LENGTH = 96;
const MAX_LOADED_WORLDS = 64;
const WorldIdentity = z
  .object({ paperWorldId: z.uuid(), dimension: z.string().max(MAX_WORLD_KEY_LENGTH) })
  .strict();
const RegisteredWorld = z.object({
  id: z.uuid(),
  paperWorldId: z.uuid(),
  dimension: z.string(),
  version: z.number().int().nonnegative(),
});
// oxlint-disable-next-line max-lines-per-function -- Scoped Minecraft declarations share one backend and world-identity boundary.
function spatialMinecraftRoutes(
  db: Database['db'] | undefined,
  actors: readonly ServiceActor[],
): OpenAPIHono {
  const app = new OpenAPIHono();
  function persistence(): Database['db'] {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'SPATIAL_UNAVAILABLE',
        'Spatial service is unavailable',
      );
    }
    return db;
  }
  app.openapi(
    createRoute({
      method: 'post',
      path: '/internal/minecraft/spatial/worlds',
      operationId: 'getMinecraftSpatialWorlds',
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: z.object({ worlds: z.array(WorldIdentity).max(MAX_LOADED_WORLDS) }).strict(),
            },
          },
        },
      },
      responses: { 200: json(z.object({ items: z.array(RegisteredWorld) })), ...Errors },
    }),
    async (context) => {
      const actor = serviceActor(context, actors, 'DENEB');
      const requested = context.req.valid('json').worlds;
      const registered = await new SpatialWorldService(persistence()).list();
      const items = registered.filter(
        (world) =>
          world.backendId === actor.backendId &&
          requested.some(
            (identity) =>
              identity.paperWorldId === world.paperWorldId &&
              identity.dimension === world.dimension,
          ),
      );
      return context.json(
        {
          items: items.map((world) => ({
            id: world.id,
            paperWorldId: world.paperWorldId,
            dimension: world.dimension,
            version: world.version,
          })),
        },
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/internal/minecraft/spatial/version',
      operationId: 'getMinecraftSpatialVersion',
      request: { body: { required: true, content: { 'application/json': { schema: Identity } } } },
      responses: {
        200: json(
          z.object({
            worldId: z.uuid(),
            paperWorldId: z.uuid(),
            version: z.number().int(),
            integrity: z.string(),
          }),
        ),
        ...Errors,
      },
    }),
    async (context) => {
      const actor = serviceActor(context, actors, 'DENEB');
      const input = context.req.valid('json');
      const snapshot = await new SpatialSnapshotService(persistence()).snapshot(input.worldId, {
        actor,
        paperWorldId: input.paperWorldId,
      });
      return context.json(
        {
          worldId: snapshot.worldId,
          paperWorldId: snapshot.paperWorldId,
          version: snapshot.version,
          integrity: snapshot.integrity,
        },
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/internal/minecraft/spatial/snapshot',
      operationId: 'getMinecraftSpatialSnapshot',
      request: { body: { required: true, content: { 'application/json': { schema: Identity } } } },
      responses: {
        200: json(
          z.object({ integrity: z.string(), payload: z.string(), generatedAt: z.iso.datetime() }),
        ),
        ...Errors,
      },
    }),
    async (context) => {
      const actor = serviceActor(context, actors, 'DENEB');
      const input = context.req.valid('json');
      const { integrity, generatedAt, ...payload } = await new SpatialSnapshotService(
        persistence(),
      ).snapshot(input.worldId, { actor, paperWorldId: input.paperWorldId });
      return context.json({ integrity, generatedAt, payload: canonicalJson(payload) }, HTTP.ok);
    },
  );
  return app;
}
export { spatialMinecraftRoutes };
