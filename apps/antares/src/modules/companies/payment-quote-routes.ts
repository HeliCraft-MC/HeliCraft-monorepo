import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { RateLimiter } from '../sessions/security';
import { TransferQuoteSchema } from '../taxation/contracts';
import {
  CompanyFinancialQuoteInputSchema,
  CompanyPaymentQuoteService,
} from './payment-quote-service';

const QUOTES_PER_WINDOW = 120;
function companyPaymentQuoteRoutes(
  db: Database['db'] | undefined,
  secureCookies: boolean,
): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  const limiter = new RateLimiter();
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/companies/{id}/finances/quotes',
      operationId: 'createCompanyPaymentQuote',
      request: {
        params: z.object({ id: z.uuid() }),
        body: { content: { 'application/json': { schema: CompanyFinancialQuoteInputSchema } } },
      },
      responses: {
        200: json(TransferQuoteSchema),
        400: json(z.object({ message: z.string() })),
        401: json(z.object({ message: z.string() })),
        403: json(z.object({ message: z.string() })),
        404: json(z.object({ message: z.string() })),
        409: json(z.object({ message: z.string() })),
        429: json(z.object({ message: z.string() })),
        503: json(z.object({ message: z.string() })),
      },
    }),
    async (context) => {
      const principal = await authenticate(context);
      limiter.take(`company-financial-quotes:${principal.id}`, QUOTES_PER_WINDOW);
      if (!db) {
        throw new DomainError(
          HTTP.unavailable,
          'COMPANY_FINANCES_UNAVAILABLE',
          'Финансы компании временно недоступны',
        );
      }
      return context.json(
        await new CompanyPaymentQuoteService(db).create(
          context.req.valid('param').id,
          { id: principal.id, admin: principal.permissions.includes('states.manage') },
          context.req.valid('json'),
        ),
        HTTP.ok,
      );
    },
  );
  return app;
}
export { companyPaymentQuoteRoutes };
