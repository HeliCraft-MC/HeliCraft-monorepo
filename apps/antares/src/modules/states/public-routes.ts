import type { Database } from '../../db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import { DomainError, HTTP } from '../errors';
import { json } from '../platform/routes';
import { LocaleSchema } from '../localized-content/contracts';

import { listPublicStates } from './directory';
import { StateDirectoryQuerySchema, StateDirectorySchema } from './directory-contracts';
import { StateService } from './service';

import { StateDetailSchema } from './contracts';

const Locale = z.object({ locale: LocaleSchema.default('ru') });

const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
function publicStateRoutes(db: Database['db'] | undefined): OpenAPIHono {
  const app = new OpenAPIHono();

  function services(): { states: StateService; db: Database['db'] } {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'STATES_UNAVAILABLE',
        'Государства временно недоступны',
      );
    }
    return { db, states: new StateService(db) };
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/states',
      operationId: 'listStates',
      request: { query: StateDirectoryQuerySchema },
      responses: {
        200: json(StateDirectorySchema),
        ...Errors,
      },
    }),
    async (context) =>
      context.json(await listPublicStates(services().db, context.req.valid('query')), HTTP.ok),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/states/{slug}',
      operationId: 'getPublicState',
      request: { params: z.object({ slug: z.string() }), query: Locale },
      responses: { 200: json(StateDetailSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().states.publicBySlug(
          context.req.valid('param').slug,
          context.req.valid('query').locale,
        ),
        HTTP.ok,
      ),
  );
  return app;
}
export { publicStateRoutes };
