// oxlint-disable max-lines -- OpenAPI declarations document both PAGE and CHRONICLE operations; handlers delegate to domain services.
// oxlint-disable import/max-dependencies -- Composition root imports each independently maintained route or contract; domain implementation stays isolated.
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getCookie } from 'hono/cookie';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { SessionService } from '../sessions/service';
import type { Principal } from '../identity/contracts';
import { DomainError, HTTP } from '../errors';
import { ContentService } from './service';
import {
  ContentInputSchema,
  PublicContentSchema,
  AdminContentSchema,
  PaginationSchema,
} from './contracts';
import type { ContentKind } from './contracts';
import { sitemapRoutes } from './sitemap';
import { renderMarkdown } from './markdown';
import { requirePermission } from '../permissions/policy';

interface JsonResponse<Schema extends z.ZodType> {
  readonly description: string;
  readonly content: Record<'application/json', { schema: Schema }>;
}
function json<Schema extends z.ZodType>(schema: Schema): JsonResponse<Schema> {
  return { description: 'Result', content: { 'application/json': { schema } } };
}
const MAX_SLUG = 120;
const MAX_MARKDOWN = 100_000;
const ErrorSchema = z.object({ message: z.string(), code: z.string().optional() });
const errors = {
  400: json(ErrorSchema),
  401: json(ErrorSchema),
  403: json(ErrorSchema),
  404: json(ErrorSchema),
  409: json(ErrorSchema),
  503: json(ErrorSchema),
};
const PublicListSchema = z.object({ items: z.array(PublicContentSchema), total: z.number().int() });
const AdminListSchema = z.object({ items: z.array(AdminContentSchema), total: z.number().int() });
const IdParams = z.object({ id: z.uuid() });
interface ContentRuntime {
  readonly service: () => ContentService;
  readonly principal: (context: Context) => Promise<Principal>;
}

function mountPublic(app: OpenAPIHono, runtime: ContentRuntime, kind: ContentKind): void {
  const path = kind === 'PAGE' ? 'pages' : 'chronicle';
  app.openapi(
    createRoute({
      method: 'get',
      path: `/public/${path}`,
      operationId: kind === 'PAGE' ? 'listPublicPages' : 'listChronicle',
      request: { query: PaginationSchema },
      responses: { 200: json(PublicListSchema), ...errors },
    }),
    async (context) => {
      const { page, pageSize } = context.req.valid('query');
      return context.json(await runtime.service().publicList(kind, page, pageSize), HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: `/public/${path}/{slug}`,
      operationId: kind === 'PAGE' ? 'getPublicPage' : 'getChronicleEntry',
      request: { params: z.object({ slug: z.string().max(MAX_SLUG) }) },
      responses: {
        200: json(z.object({ document: PublicContentSchema, redirect: z.boolean() })),
        ...errors,
      },
    }),
    async (context) =>
      context.json(
        await runtime.service().publicDocument(kind, context.req.valid('param').slug),
        HTTP.ok,
      ),
  );
}
function mountAdmin(app: OpenAPIHono, runtime: ContentRuntime, kind: ContentKind): void {
  const path = kind === 'PAGE' ? 'pages' : 'chronicle';
  const operation = kind === 'PAGE' ? 'Page' : 'ChronicleEntry';
  app.openapi(
    createRoute({
      method: 'get',
      path: `/admin/${path}`,
      operationId: kind === 'PAGE' ? 'listAdminPages' : 'listAdminChronicleEntries',
      request: { query: PaginationSchema },
      responses: { 200: json(AdminListSchema), ...errors },
    }),
    async (context) => {
      const { page, pageSize } = context.req.valid('query');
      return context.json(
        await runtime
          .service()
          .adminList(kind, { page, pageSize }, await runtime.principal(context)),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: `/admin/${path}`,
      operationId: `create${operation}`,
      request: {
        body: { required: true, content: { 'application/json': { schema: ContentInputSchema } } },
      },
      responses: { 200: json(AdminContentSchema), ...errors },
    }),
    async (context) =>
      context.json(
        await runtime
          .service()
          .create(kind, context.req.valid('json'), await runtime.principal(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: `/admin/${path}/{id}`,
      operationId: `getAdmin${operation}`,
      request: { params: IdParams },
      responses: { 200: json(AdminContentSchema), ...errors },
    }),
    async (context) =>
      context.json(
        await runtime
          .service()
          .adminDocument(context.req.valid('param').id, await runtime.principal(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'patch',
      path: `/admin/${path}/{id}`,
      operationId: `save${operation}`,
      request: {
        params: IdParams,
        body: { required: true, content: { 'application/json': { schema: ContentInputSchema } } },
      },
      responses: { 200: json(AdminContentSchema), ...errors },
    }),
    async (context) =>
      context.json(
        await runtime
          .service()
          .save(
            context.req.valid('param').id,
            context.req.valid('json'),
            await runtime.principal(context),
          ),
        HTTP.ok,
      ),
  );
  for (const action of ['publish', 'unpublish', 'archive'] as const) {
    app.openapi(
      createRoute({
        method: 'post',
        path: `/admin/${path}/{id}/${action}`,
        operationId: `${action}${operation}`,
        request: { params: IdParams },
        responses: { 200: json(AdminContentSchema), ...errors },
      }),
      async (context) =>
        context.json(
          await runtime
            .service()
            .publish(
              context.req.valid('param').id,
              action === 'archive' ? 'ARCHIVED' : action === 'publish',
              await runtime.principal(context),
            ),
          HTTP.ok,
        ),
    );
  }
  const RevisionSchema = z.object({
    id: z.uuid(),
    documentId: z.uuid(),
    revision: z.number().int(),
    snapshot: ContentInputSchema,
    editorId: z.uuid(),
    createdAt: z.iso.datetime(),
  });
  app.openapi(
    createRoute({
      method: 'get',
      path: `/admin/${path}/{id}/revisions`,
      operationId: `get${operation}Revisions`,
      request: { params: IdParams },
      responses: { 200: json(z.array(RevisionSchema)), ...errors },
    }),
    async (context) => {
      const rows = await runtime
        .service()
        .revisions(context.req.valid('param').id, await runtime.principal(context));
      return context.json(
        rows.map((row) => ({
          id: row.id,
          documentId: row.documentId,
          revision: row.revision,
          editorId: row.editorId,
          snapshot: ContentInputSchema.parse(row.snapshot),
          createdAt: row.createdAt.toISOString(),
        })),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: `/admin/${path}/{id}/restore`,
      operationId: `restore${operation}`,
      request: {
        params: IdParams,
        body: {
          required: true,
          content: {
            'application/json': {
              schema: z.strictObject({ revision: z.number().int().positive() }),
            },
          },
        },
      },
      responses: { 200: json(AdminContentSchema), ...errors },
    }),
    async (context) =>
      context.json(
        await runtime
          .service()
          .restore(
            context.req.valid('param').id,
            context.req.valid('json').revision,
            await runtime.principal(context),
          ),
        HTTP.ok,
      ),
  );
}

function contentRoutes(
  db: Database['db'] | undefined,
  secureCookies: boolean,
  siteOrigin: string,
): OpenAPIHono {
  const app = new OpenAPIHono();
  app.route('/public', sitemapRoutes(db, siteOrigin));
  const service = db ? new ContentService(db) : null;
  const sessions = db ? new SessionService(db) : null;
  const runtime: ContentRuntime = {
    service: () => {
      if (!service) {
        throw new DomainError(
          HTTP.unavailable,
          'PERSISTENCE_UNAVAILABLE',
          'Контент временно недоступен',
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
  for (const kind of ['PAGE', 'CHRONICLE'] as const) {
    mountPublic(app, runtime, kind);
    mountAdmin(app, runtime, kind);
  }
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/content/preview',
      operationId: 'previewMarkdown',
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: z.strictObject({ markdown: z.string().max(MAX_MARKDOWN) }),
            },
          },
        },
      },
      responses: { 200: json(z.object({ html: z.string() })), ...errors },
    }),
    async (context) => {
      const principal = await runtime.principal(context);
      requirePermission(principal.roles, 'content.write');
      return context.json(
        { html: await renderMarkdown(context.req.valid('json').markdown) },
        HTTP.ok,
      );
    },
  );
  return app;
}
export { contentRoutes };
