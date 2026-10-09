import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getCookie } from 'hono/cookie';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { SessionService } from '../sessions/service';
import type { Principal } from '../identity/contracts';
import { PrincipalSchema, RoleSchema } from '../identity/contracts';
import { HTTP, DomainError } from '../errors';
import { AdministrationService } from './service';
import { PaginationSchema } from '../content/contracts';

function json<Schema extends z.ZodType>(
  schema: Schema,
): { description: string; content: Record<'application/json', { schema: Schema }> } {
  return { description: 'Result', content: { 'application/json': { schema } } };
}
const MAX_SEARCH_LENGTH = 100;
const MAX_ROLES = 5;
const ErrorSchema = z.object({ message: z.string(), code: z.string().optional() });
const errors = {
  400: json(ErrorSchema),
  401: json(ErrorSchema),
  403: json(ErrorSchema),
  404: json(ErrorSchema),
  409: json(ErrorSchema),
  503: json(ErrorSchema),
};
const SuccessSchema = z.object({ success: z.literal(true) });
const UserDetailSchema = PrincipalSchema.extend({
  lastLoginAt: z.iso.datetime().nullable(),
  history: z.array(
    z.object({ oldUsername: z.string(), newUsername: z.string(), changedAt: z.iso.datetime() }),
  ),
});
const UserQuerySchema = PaginationSchema.extend({
  search: z.string().max(MAX_SEARCH_LENGTH).default(''),
  role: RoleSchema.optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
});
const UserParams = z.object({ uuid: z.uuid() });
interface AdminRuntime {
  readonly service: () => AdministrationService;
  readonly principal: (context: Context) => Promise<Principal>;
}

function mountReadRoutes(app: OpenAPIHono, runtime: AdminRuntime): void {
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/users',
      operationId: 'listUsers',
      request: { query: UserQuerySchema },
      responses: {
        200: json(z.object({ items: z.array(PrincipalSchema), total: z.number().int() })),
        ...errors,
      },
    }),
    async (context) =>
      context.json(
        await runtime.service().list(await runtime.principal(context), context.req.valid('query')),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/users/{uuid}',
      operationId: 'getUserDetails',
      request: { params: UserParams },
      responses: { 200: json(UserDetailSchema), ...errors },
    }),
    async (context) =>
      context.json(
        await runtime
          .service()
          .details(context.req.valid('param').uuid, await runtime.principal(context)),
        HTTP.ok,
      ),
  );
  const StatsSchema = z.object({
    users: z.number().int().nullable(),
    activeUsers: z.number().int().nullable(),
    publishedPages: z.number().int(),
    draftPages: z.number().int(),
    publishedChronicle: z.number().int(),
  });
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/stats',
      operationId: 'getAdminStats',
      responses: { 200: json(StatsSchema), ...errors },
    }),
    async (context) =>
      context.json(await runtime.service().stats(await runtime.principal(context)), HTTP.ok),
  );
  const AuditSchema = z.object({
    id: z.uuid(),
    actorId: z.uuid(),
    action: z.string(),
    targetType: z.string(),
    targetId: z.uuid(),
    occurredAt: z.iso.datetime(),
    metadata: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    ),
  });
  const AuditQuery = PaginationSchema.extend({
    actor: z.uuid().optional(),
    target: z.uuid().optional(),
    action: z.string().max(MAX_SEARCH_LENGTH).optional(),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  });
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/audit',
      operationId: 'getAudit',
      request: { query: AuditQuery },
      responses: {
        200: json(z.object({ items: z.array(AuditSchema), total: z.number().int() })),
        ...errors,
      },
    }),
    async (context) => {
      const query = context.req.valid('query');
      return context.json(
        await runtime.service().audit(await runtime.principal(context), {
          ...query,
          from: query.from === undefined ? undefined : new Date(query.from),
          to: query.to === undefined ? undefined : new Date(query.to),
        }),
        HTTP.ok,
      );
    },
  );
}
function mountWriteRoutes(app: OpenAPIHono, runtime: AdminRuntime): void {
  app.openapi(
    createRoute({
      method: 'patch',
      path: '/admin/users/{uuid}/status',
      operationId: 'changeUserStatus',
      request: {
        params: UserParams,
        body: {
          required: true,
          content: {
            'application/json': {
              schema: z.strictObject({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']) }),
            },
          },
        },
      },
      responses: { 200: json(SuccessSchema), ...errors },
    }),
    async (context) => {
      await runtime
        .service()
        .status(
          context.req.valid('param').uuid,
          context.req.valid('json').status,
          await runtime.principal(context),
        );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'put',
      path: '/admin/users/{uuid}/roles',
      operationId: 'changeUserRoles',
      request: {
        params: UserParams,
        body: {
          required: true,
          content: {
            'application/json': {
              schema: z.strictObject({ roles: z.array(RoleSchema).min(1).max(MAX_ROLES) }),
            },
          },
        },
      },
      responses: { 200: json(SuccessSchema), ...errors },
    }),
    async (context) => {
      await runtime
        .service()
        .roles(
          context.req.valid('param').uuid,
          context.req.valid('json').roles,
          await runtime.principal(context),
        );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/users/{uuid}/revoke-sessions',
      operationId: 'revokeUserSessions',
      request: { params: UserParams },
      responses: { 200: json(SuccessSchema), ...errors },
    }),
    async (context) => {
      await runtime
        .service()
        .revokeSessions(context.req.valid('param').uuid, await runtime.principal(context));
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
}

function administrationRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const sessions = db ? new SessionService(db) : null;
  const service = db ? new AdministrationService(db) : null;
  const runtime: AdminRuntime = {
    service: () => {
      if (!service) {
        throw new DomainError(
          HTTP.unavailable,
          'PERSISTENCE_UNAVAILABLE',
          'Сервис администрации недоступен',
        );
      }
      return service;
    },
    principal: async (context) => {
      if (!sessions) {
        throw new DomainError(
          HTTP.unavailable,
          'PERSISTENCE_UNAVAILABLE',
          'Сервис аккаунтов недоступен',
        );
      }
      const current = await sessions.authenticate(
        getCookie(context, secureCookies ? '__Host-helicraft' : 'helicraft_session'),
      );
      return current.principal;
    },
  };
  mountReadRoutes(app, runtime);
  mountWriteRoutes(app, runtime);
  return app;
}
export { administrationRoutes };
