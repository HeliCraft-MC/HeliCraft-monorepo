// oxlint-disable import/max-dependencies, max-lines -- Typed spatial HTTP composition delegates authority and geometry to domain services.
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { json, authenticator } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { RateLimiter } from '../sessions/security';
import { DirectiveDetailSchema } from '../monetary/contracts';
import type { MonetaryActor } from '../monetary/contracts';
import { TerritoryDraftService } from './drafts';
import { SpatialWorldService } from './worlds';
import { SpatialSnapshotService } from './snapshots';
import { TerritorialRatificationService } from './ratification';
import {
  SpatialWorldInputSchema,
  SpatialWorldSchema,
  TerritoryDraftInputSchema,
  TerritoryDraftSchema,
  SpatialAnalysisSchema,
  SpatialSnapshotSchema,
  SPATIAL_LIMITS,
} from './contracts';

const Id = z.object({ id: z.uuid() });
const StateId = z.object({ stateId: z.uuid() });
const Version = z.object({ version: z.number().int().positive() }).strict();
const REASON_LIMIT = 2000;
const Reason = z.string().trim().min(1).max(REASON_LIMIT);
const ErrorSchema = z.object({ message: z.string(), code: z.string().optional() });
const Errors = {
  400: json(ErrorSchema),
  401: json(ErrorSchema),
  403: json(ErrorSchema),
  404: json(ErrorSchema),
  409: json(ErrorSchema),
  429: json(ErrorSchema),
  503: json(ErrorSchema),
};
const coordinate = z.coerce.number().min(-SPATIAL_LIMITS.coordinate).max(SPATIAL_LIMITS.coordinate);
const Bounds = z
  .object({
    minX: coordinate.optional(),
    minZ: coordinate.optional(),
    maxX: coordinate.optional(),
    maxZ: coordinate.optional(),
  })
  .superRefine((bounds, context) => {
    const values = [bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ];
    if (
      values.some((value) => value !== undefined) &&
      (values.some((value) => value === undefined) ||
        (bounds.minX ?? 0) >= (bounds.maxX ?? 0) ||
        (bounds.minZ ?? 0) >= (bounds.maxZ ?? 0))
    ) {
      context.addIssue({ code: 'custom', message: 'Provide all four ordered Minecraft bounds' });
    }
  });
const Application = z
  .object({
    id: z.uuid(),
    status: z.enum(['REVIEW', 'APPROVED', 'REJECTED']),
    draft: TerritoryDraftSchema,
    analysis: SpatialAnalysisSchema,
    decision: DirectiveDetailSchema,
    createdAt: z.iso.datetime(),
    review: z
      .object({
        actorId: z.uuid(),
        decision: z.enum(['APPROVE', 'REJECT']),
        reason: z.string(),
        createdAt: z.iso.datetime(),
      })
      .nullable(),
  })
  .openapi('TerritorialApplication');
const MUTATIONS_PER_WINDOW = 120;
// oxlint-disable-next-line max-lines-per-function -- OpenAPI declarations expose one bounded workflow; services own every state transition.
function spatialRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  const limiter = new RateLimiter();
  function services(): {
    drafts: TerritoryDraftService;
    worlds: SpatialWorldService;
    snapshots: SpatialSnapshotService;
    reviews: TerritorialRatificationService;
  } {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'SPATIAL_UNAVAILABLE',
        'Spatial service is unavailable',
      );
    }
    return {
      drafts: new TerritoryDraftService(db),
      worlds: new SpatialWorldService(db),
      snapshots: new SpatialSnapshotService(db),
      reviews: new TerritorialRatificationService(db),
    };
  }
  async function actor(context: Context): Promise<MonetaryActor> {
    const principal = await authenticate(context);
    if (context.req.method !== 'GET') {
      limiter.take(`spatial:${principal.id}`, MUTATIONS_PER_WINDOW);
    }
    return { id: principal.id, admin: principal.permissions.includes('states.manage') };
  }
  async function actorId(context: Context): Promise<string> {
    const principal = await actor(context);
    return principal.id;
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/spatial/worlds',
      operationId: 'listSpatialWorlds',
      responses: { 200: json(z.object({ items: z.array(SpatialWorldSchema) })), ...Errors },
    }),
    async (context) => context.json({ items: await services().worlds.list() }, HTTP.ok),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/spatial/worlds/{id}/territories',
      operationId: 'getPoliticalMap',
      request: { params: Id, query: Bounds },
      responses: { 200: json(SpatialSnapshotSchema), ...Errors },
    }),
    async (context) => {
      const bounds = context.req.valid('query');
      const complete =
        bounds.minX !== undefined &&
        bounds.minZ !== undefined &&
        bounds.maxX !== undefined &&
        bounds.maxZ !== undefined
          ? { minX: bounds.minX, minZ: bounds.minZ, maxX: bounds.maxX, maxZ: bounds.maxZ }
          : undefined;
      return context.json(
        await services().snapshots.snapshot(context.req.valid('param').id, undefined, complete),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/spatial/worlds',
      operationId: 'registerSpatialWorld',
      request: {
        body: {
          required: true,
          content: { 'application/json': { schema: SpatialWorldInputSchema } },
        },
      },
      responses: { 200: json(SpatialWorldSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().worlds.register(await actorId(context), context.req.valid('json')),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/spatial/worlds/{id}/retire',
      operationId: 'retireSpatialWorld',
      request: {
        params: Id,
        body: {
          required: true,
          content: { 'application/json': { schema: z.object({ reason: Reason }).strict() } },
        },
      },
      responses: { 200: json(z.object({ success: z.literal(true) })), ...Errors },
    }),
    async (context) => {
      await services().worlds.retire(
        context.req.valid('param').id,
        await actorId(context),
        context.req.valid('json').reason,
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{stateId}/territory/drafts',
      operationId: 'listTerritoryDrafts',
      request: { params: StateId },
      responses: { 200: json(z.object({ items: z.array(TerritoryDraftSchema) })), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          items: await services().drafts.list(
            context.req.valid('param').stateId,
            await actor(context),
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/states/{stateId}/territory/drafts',
      operationId: 'createTerritoryDraft',
      request: {
        params: StateId,
        body: {
          required: true,
          content: { 'application/json': { schema: TerritoryDraftInputSchema } },
        },
      },
      responses: { 200: json(TerritoryDraftSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().drafts.create(
          context.req.valid('param').stateId,
          await actor(context),
          context.req.valid('json'),
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/territory/drafts/{id}',
      operationId: 'getTerritoryDraft',
      request: { params: Id },
      responses: { 200: json(TerritoryDraftSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().drafts.detail(context.req.valid('param').id, await actor(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'put',
      path: '/account/territory/drafts/{id}',
      operationId: 'saveTerritoryDraft',
      request: {
        params: Id,
        body: {
          required: true,
          content: {
            'application/json': {
              schema: TerritoryDraftInputSchema.extend({ version: z.number().int().positive() }),
            },
          },
        },
      },
      responses: { 200: json(TerritoryDraftSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().drafts.save(
          context.req.valid('param').id,
          await actor(context),
          context.req.valid('json'),
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/territory/drafts/{id}/preview',
      operationId: 'previewTerritoryDraft',
      request: { params: Id },
      responses: { 200: json(SpatialAnalysisSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().drafts.preview(context.req.valid('param').id, await actor(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/territory/drafts/{id}/submit',
      operationId: 'submitTerritoryDraft',
      request: {
        params: Id,
        body: { required: true, content: { 'application/json': { schema: Version } } },
      },
      responses: { 200: json(Id), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          id: await services().drafts.submit(
            context.req.valid('param').id,
            await actor(context),
            context.req.valid('json').version,
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/spatial/applications',
      operationId: 'listTerritorialApplications',
      responses: { 200: json(z.object({ items: z.array(Application) })), ...Errors },
    }),
    async (context) =>
      context.json({ items: await services().reviews.list(await actorId(context)) }, HTTP.ok),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/spatial/applications/{id}',
      operationId: 'getTerritorialApplication',
      request: { params: Id },
      responses: { 200: json(Application), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().reviews.detail(context.req.valid('param').id, await actorId(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/spatial/applications/{id}/review',
      operationId: 'reviewTerritorialApplication',
      request: {
        params: Id,
        body: {
          required: true,
          content: {
            'application/json': {
              schema: z
                .object({ decision: z.enum(['APPROVE', 'REJECT']), reason: Reason })
                .strict(),
            },
          },
        },
      },
      responses: { 200: json(z.object({ revisionId: z.uuid().nullable() })), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          revisionId: await services().reviews.review(
            context.req.valid('param').id,
            await actorId(context),
            context.req.valid('json'),
          ),
        },
        HTTP.ok,
      ),
  );
  return app;
}
export { spatialRoutes };
