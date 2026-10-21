import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { CompanyApplicationSchema, CompanyApplicationsSchema } from './application-contracts';
import { CompanyApplicationService } from './application-read';
import { StateCompanyReadService } from './state-read';
import { DirectiveDetailSchema } from '../monetary/contracts';

const MAX_PAGE = 1_000_000;
// oxlint-disable-next-line max-lines-per-function -- Two explicit read-only OpenAPI declarations share authenticated service composition; authorization and projection remain in the service.
function companyApplicationRoutes(
  db: Database['db'] | undefined,
  secureCookies: boolean,
): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{id}/company-decisions',
      operationId: 'listStateCompanyDecisions',
      request: {
        params: z.object({ id: z.uuid() }),
        query: z.object({ page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1) }),
      },
      responses: {
        200: json(
          z.object({
            items: z.array(DirectiveDetailSchema),
            page: z.number().int(),
            hasMore: z.boolean(),
          }),
        ),
        401: json(z.object({ message: z.string() })),
        403: json(z.object({ message: z.string() })),
        404: json(z.object({ message: z.string() })),
        503: json(z.object({ message: z.string() })),
      },
    }),
    async (context) => {
      const principal = await authenticate(context);
      if (db === undefined) {
        throw new DomainError(
          HTTP.unavailable,
          'COMPANIES_UNAVAILABLE',
          'Компании временно недоступны',
        );
      }
      return context.json(
        await new StateCompanyReadService(db).decisions(
          context.req.valid('param').id,
          { id: principal.id, admin: principal.permissions.includes('states.manage') },
          context.req.valid('query').page,
        ),
        HTTP.ok,
      );
    },
  );
  function service(): CompanyApplicationService {
    if (db === undefined) {
      throw new DomainError(
        HTTP.unavailable,
        'COMPANIES_UNAVAILABLE',
        'Компании временно недоступны',
      );
    }
    return new CompanyApplicationService(db);
  }
  const errors = {
    401: json(z.object({ message: z.string() })),
    403: json(z.object({ message: z.string() })),
    404: json(z.object({ message: z.string() })),
    503: json(z.object({ message: z.string() })),
  };
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/company-applications/{id}',
      operationId: 'getCompanyRegistrationApplication',
      request: { params: z.object({ id: z.uuid() }) },
      responses: { 200: json(CompanyApplicationSchema), ...errors },
    }),
    async (context) => {
      const principal = await authenticate(context);
      return context.json(
        await service().detail(context.req.valid('param').id, {
          id: principal.id,
          admin: principal.permissions.includes('states.manage'),
        }),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{id}/company-applications',
      operationId: 'listStateCompanyRegistrationApplications',
      request: {
        params: z.object({ id: z.uuid() }),
        query: z.object({ page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1) }),
      },
      responses: { 200: json(CompanyApplicationsSchema), ...errors },
    }),
    async (context) => {
      const principal = await authenticate(context);
      return context.json(
        await service().state(
          context.req.valid('param').id,
          { id: principal.id, admin: principal.permissions.includes('states.manage') },
          context.req.valid('query').page,
        ),
        HTTP.ok,
      );
    },
  );
  return app;
}
export { companyApplicationRoutes };
