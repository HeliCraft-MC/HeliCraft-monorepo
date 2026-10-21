// oxlint-disable import/max-dependencies -- Typed company routes compose protected workspaces, the current-access directory and immutable decision commands over shared contracts.
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { RateLimiter } from '../sessions/security';
import { DomainError, HTTP } from '../errors';
import { listCompanyWorkspaces } from './workspace-directory';
import { PublishedCompanyIdentitySchema } from './public-contracts';
import { CompanyDecisionService } from './decisions';
import { CompanyWorkspaceService } from './workspace-read';
import { CompanyDecisionInputSchema } from './decision-contracts';
import type { CompanyActor } from './decision-contracts';
import {
  CompanyDecisionDetailSchema,
  CompanyDecisionSummarySchema,
  CompanyWorkspaceSchema,
} from './read-contracts';

const MUTATIONS_PER_WINDOW = 300;
const MAX_PAGE = 1_000_000;
const MAX_REASON = 2000;
const Id = z.object({ id: z.uuid() });
const Success = z.object({ success: z.literal(true) });
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  429: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- Explicit typed HTTP declarations delegate access, proposal evidence and execution to company domain services.
function companyDecisionRoutes(
  db: Database['db'] | undefined,
  secureCookies: boolean,
): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  const limiter = new RateLimiter();
  async function actor(context: Context): Promise<CompanyActor> {
    const principal = await authenticate(context);
    if (context.req.method !== 'GET') {
      limiter.take(`company-decisions:${principal.id}`, MUTATIONS_PER_WINDOW);
    }
    return { id: principal.id, admin: principal.permissions.includes('states.manage') };
  }
  function services(): {
    decisions: CompanyDecisionService;
    workspace: CompanyWorkspaceService;
    workspaceDatabase: Database['db'];
  } {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'COMPANIES_UNAVAILABLE',
        'Компании временно недоступны',
      );
    }
    return {
      workspaceDatabase: db,
      decisions: new CompanyDecisionService(db),
      workspace: new CompanyWorkspaceService(db),
    };
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/companies',
      operationId: 'listCompanyWorkspaces',
      request: {
        query: z.object({ page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1) }),
      },
      responses: {
        200: json(
          z.object({
            items: z.array(PublishedCompanyIdentitySchema),
            page: z.number().int(),
            hasMore: z.boolean(),
          }),
        ),
        ...Errors,
      },
    }),
    async (context) => {
      const principal = await actor(context);
      return context.json(
        await listCompanyWorkspaces(
          services().workspaceDatabase,
          principal,
          context.req.valid('query').page,
        ),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/companies/{id}',
      operationId: 'getCompanyWorkspace',
      request: { params: Id },
      responses: { 200: json(CompanyWorkspaceSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().workspace.detail(context.req.valid('param').id, await actor(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/companies/{id}/decisions',
      operationId: 'listCompanyDecisions',
      request: {
        params: Id,
        query: z.object({ page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1) }),
      },
      responses: {
        200: json(
          z.object({
            items: z.array(CompanyDecisionSummarySchema),
            page: z.number().int(),
            hasMore: z.boolean(),
          }),
        ),
        ...Errors,
      },
    }),
    async (context) =>
      context.json(
        await services().decisions.list(
          context.req.valid('param').id,
          await actor(context),
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/companies/{id}/decisions',
      operationId: 'createCompanyDecision',
      request: {
        params: Id,
        body: { content: { 'application/json': { schema: CompanyDecisionInputSchema } } },
      },
      responses: { 200: json(Id), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          id: await services().decisions.create(
            context.req.valid('param').id,
            await actor(context),
            context.req.valid('json'),
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/company-decisions/{id}',
      operationId: 'getCompanyDecision',
      request: { params: Id },
      responses: { 200: json(CompanyDecisionDetailSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().decisions.detail(context.req.valid('param').id, await actor(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/company-decisions/{id}/approve',
      operationId: 'approveCompanyDecision',
      request: {
        params: Id,
        body: {
          content: { 'application/json': { schema: z.object({ officeId: z.uuid() }).strict() } },
        },
      },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().decisions.approve(
        context.req.valid('param').id,
        await actor(context),
        context.req.valid('json').officeId,
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/company-decisions/{id}/revoke',
      operationId: 'revokeCompanyDecisionApproval',
      request: {
        params: Id,
        body: {
          content: { 'application/json': { schema: z.object({ approvalId: z.uuid() }).strict() } },
        },
      },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().decisions.revoke(
        context.req.valid('param').id,
        await actor(context),
        context.req.valid('json').approvalId,
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/company-decisions/{id}/apply',
      operationId: 'applyCompanyDecision',
      request: {
        params: Id,
        body: {
          content: {
            'application/json': {
              schema: z.object({ reason: z.string().trim().max(MAX_REASON).default('') }).strict(),
            },
          },
        },
      },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().decisions.apply(
        context.req.valid('param').id,
        await actor(context),
        context.req.valid('json').reason,
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/company-decisions/{id}/cancel',
      operationId: 'cancelCompanyDecision',
      request: { params: Id },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().decisions.cancel(context.req.valid('param').id, await actor(context));
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  return app;
}
export { companyDecisionRoutes };
