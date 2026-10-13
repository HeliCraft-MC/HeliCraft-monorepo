import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { json, authenticator } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { searchPlayers, getPlayers } from './service';
import { PublicPlayerProfileSchema } from './profile-contracts';
import { publicPlayerProfile } from './profile';

const MIN_QUERY = 2;
const MAX_QUERY = 16;
const MAX_LOOKUP = 100;
const PlayerList = z.object({ items: z.array(z.object({ id: z.uuid(), name: z.string() })) });
// oxlint-disable-next-line max-lines-per-function -- Two typed player route declarations reuse the shared player service.
function playerRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/players/{id}',
      operationId: 'getPublicPlayerProfile',
      request: { params: z.object({ id: z.uuid() }) },
      responses: {
        200: json(PublicPlayerProfileSchema),
        404: json(z.object({ message: z.string() })),
        503: json(z.object({ message: z.string() })),
      },
    }),
    async (context) => {
      if (!db) {
        throw new DomainError(HTTP.unavailable, 'PERSISTENCE_UNAVAILABLE', 'Профиль недоступен');
      }
      return context.json(await publicPlayerProfile(db, context.req.valid('param').id), HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/players/search',
      operationId: 'searchPlayers',
      request: {
        query: z.object({
          query: z
            .string()
            .min(MIN_QUERY)
            .max(MAX_QUERY)
            .regex(/^[A-Za-z0-9_]+$/u),
        }),
      },
      responses: { 200: json(PlayerList) },
    }),
    async (context) => {
      await authenticate(context);
      if (!db) {
        throw new DomainError(HTTP.unavailable, 'PERSISTENCE_UNAVAILABLE', 'Поиск недоступен');
      }
      return context.json(
        { items: await searchPlayers(db, context.req.valid('query').query) },
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/players/lookup',
      operationId: 'lookupPlayers',
      request: {
        body: {
          content: {
            'application/json': { schema: z.object({ ids: z.array(z.uuid()).max(MAX_LOOKUP) }) },
          },
        },
      },
      responses: { 200: json(PlayerList) },
    }),
    async (context) => {
      await authenticate(context);
      if (!db) {
        throw new DomainError(HTTP.unavailable, 'PERSISTENCE_UNAVAILABLE', 'Поиск недоступен');
      }
      return context.json({ items: await getPlayers(db, context.req.valid('json').ids) }, HTTP.ok);
    },
  );
  return app;
}
export { playerRoutes };
