import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { RateLimiter } from '../sessions/security';
import { CompanyLifecycleService } from './lifecycle';
import {
  CompanyStatusChangeSchema,
  CompanyLifecyclePageSchema,
  CompanyManualQueueSchema,
} from './lifecycle-contracts';

const Id = z.object({ id: z.uuid() });
// oxlint-disable-next-line no-magic-numbers -- Protected list pagination uses the existing corporate page bound.
const Page = z.object({ page: z.coerce.number().int().min(1).max(10_000).default(1) });
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  429: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- OpenAPI lifecycle declarations delegate all authorization, transitions and evidence to domain services.
function companyLifecycleRoutes(
  db: Database['db'] | undefined,
  secureCookies: boolean,
): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  const limiter = new RateLimiter();
  function service(): CompanyLifecycleService {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'COMPANIES_UNAVAILABLE',
        'Компании временно недоступны',
      );
    }
    return new CompanyLifecycleService(db);
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/companies/{id}/status-history',
      operationId: 'listCompanyLifecycleHistory',
      request: { params: Id, query: Page },
      responses: { 200: json(CompanyLifecyclePageSchema), ...Errors },
    }),
    async (context) => {
      const principal = await authenticate(context);
      return context.json(
        await service().history(
          context.req.valid('param').id,
          { id: principal.id, admin: principal.permissions.includes('states.manage') },
          context.req.valid('query').page,
        ),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/companies/{id}/status',
      operationId: 'changeCompanyStatus',
      request: {
        params: Id,
        body: { content: { 'application/json': { schema: CompanyStatusChangeSchema } } },
      },
      responses: { 200: json(z.object({ success: z.literal(true) })), ...Errors },
    }),
    async (context) => {
      const principal = await authenticate(context);
      // oxlint-disable-next-line no-magic-numbers -- Administrative lifecycle mutation rate limit matches other protected company commands.
      limiter.take(`company-status:${principal.id}`, 300);
      await service().change(
        context.req.valid('param').id,
        principal.id,
        context.req.valid('json'),
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/companies/manual-decisions',
      operationId: 'listCompanyManualDecisions',
      request: { query: Page },
      responses: { 200: json(CompanyManualQueueSchema), ...Errors },
    }),
    async (context) => {
      const principal = await authenticate(context);
      return context.json(
        await service().manualQueue(principal.id, context.req.valid('query').page),
        HTTP.ok,
      );
    },
  );
  return app;
}
export { companyLifecycleRoutes };
