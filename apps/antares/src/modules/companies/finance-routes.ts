import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { CompanyWalletSchema, CompanyFinanceService } from './finance';

const MAX_PAGE = 1_000_000;
function companyFinanceRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/companies/{id}/finances',
      operationId: 'getCompanyFinances',
      request: {
        params: z.object({ id: z.uuid() }),
        query: z.object({ page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1) }),
      },
      responses: {
        200: json(CompanyWalletSchema),
        401: json(z.object({ message: z.string() })),
        404: json(z.object({ message: z.string() })),
        503: json(z.object({ message: z.string() })),
      },
    }),
    async (context) => {
      const principal = await authenticate(context);
      if (!db) {
        throw new DomainError(
          HTTP.unavailable,
          'COMPANY_FINANCES_UNAVAILABLE',
          'Финансы компании временно недоступны',
        );
      }
      return context.json(
        await new CompanyFinanceService(db).wallet(
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
export { companyFinanceRoutes };
