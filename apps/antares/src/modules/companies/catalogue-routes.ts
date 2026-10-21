import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { CompanyCatalogueQuerySchema, CompanyCatalogueSchema } from './catalogue-contracts';
import { listCompanyCatalogue } from './catalogue';

function companyCatalogueRoutes(db: Database['db'] | undefined): OpenAPIHono {
  const app = new OpenAPIHono();
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/companies/catalogue',
      operationId: 'listCompanyCatalogue',
      request: { query: CompanyCatalogueQuerySchema },
      responses: {
        200: json(CompanyCatalogueSchema),
        400: json(z.object({ message: z.string() })),
        503: json(z.object({ message: z.string() })),
      },
    }),
    async (context) => {
      if (!db) {
        throw new DomainError(
          HTTP.unavailable,
          'COMPANY_DIRECTORY_UNAVAILABLE',
          'Каталог компаний временно недоступен',
        );
      }
      return context.json(await listCompanyCatalogue(db, context.req.valid('query')), HTTP.ok);
    },
  );
  return app;
}
export { companyCatalogueRoutes };
