import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { PublicCompanyDirectoryService } from './public-directory';
import { PublicCompanyProfileService } from './profile';
import { CompanyProfileQuerySchema, PublishedCompanyProfileSchema } from './profile-contracts';
import {
  PublishedCompanyIdentitySchema,
  PublishedCompanyDirectorySchema,
} from './public-contracts';

const MAX_QUERY = 100;
// oxlint-disable-next-line max-lines-per-function -- Public OpenAPI declarations contain only request validation and delegation to read-only projections.
function publicCompanyRoutes(db: Database['db'] | undefined): OpenAPIHono {
  const app = new OpenAPIHono();
  function service(): PublicCompanyDirectoryService {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'COMPANY_DIRECTORY_UNAVAILABLE',
        'Каталог компаний временно недоступен',
      );
    }
    return new PublicCompanyDirectoryService(db);
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/companies',
      operationId: 'listPublishedCompanies',
      request: {
        query: z.object({
          query: z.string().trim().max(MAX_QUERY).default(''),
          after: z.uuid().optional(),
        }),
      },
      responses: {
        200: json(PublishedCompanyDirectorySchema),
        400: json(z.object({ message: z.string() })),
        503: json(z.object({ message: z.string() })),
      },
    }),
    async (context) => context.json(await service().list(context.req.valid('query')), HTTP.ok),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/companies/{id}',
      operationId: 'getPublishedCompanyProfile',
      request: { params: z.object({ id: z.uuid() }), query: CompanyProfileQuerySchema },
      responses: {
        200: json(PublishedCompanyProfileSchema),
        404: json(z.object({ message: z.string() })),
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
      return context.json(
        await new PublicCompanyProfileService(db).detail(
          context.req.valid('param').id,
          context.req.valid('query'),
        ),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/companies/{id}/identity',
      operationId: 'getPublishedCompanyIdentity',
      request: { params: z.object({ id: z.uuid() }) },
      responses: {
        200: json(PublishedCompanyIdentitySchema),
        404: json(z.object({ message: z.string() })),
        503: json(z.object({ message: z.string() })),
      },
    }),
    async (context) =>
      context.json(await service().identity(context.req.valid('param').id), HTTP.ok),
  );
  return app;
}
export { publicCompanyRoutes };
