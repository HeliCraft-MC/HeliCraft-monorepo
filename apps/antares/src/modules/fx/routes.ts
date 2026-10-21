// oxlint-disable import/max-dependencies -- OpenAPI composition binds authenticated actors, bounded contracts and shared FX services.
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { HTTP } from '../errors';
import { RateLimiter } from '../sessions/security';
import type { MonetaryActor } from '../monetary/contracts';
import { FxService } from './service';
import { FxQuoteInputSchema, FxFillInputSchema } from './contracts';
import {
  FxQuoteSchema,
  FxReceiptSchema,
  FxReceiptListSchema,
  StateFxSchema,
} from './read-contracts';
import { Id, Page, Success, Errors, fxDatabase } from './route-contracts';

const MUTATIONS_PER_WINDOW = 120;
// oxlint-disable-next-line max-lines-per-function -- OpenAPI declarations delegate every authenticated command and read to the shared service.
function fxRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  const limiter = new RateLimiter();
  async function actor(context: Context): Promise<MonetaryActor> {
    const principal = await authenticate(context);
    if (context.req.method !== 'GET') {
      limiter.take(`fx:${principal.id}`, MUTATIONS_PER_WINDOW);
    }
    return { id: principal.id, admin: principal.permissions.includes('states.manage') };
  }
  function service(): FxService {
    return new FxService(fxDatabase(db));
  }
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/fx/offers/{id}/quotes',
      operationId: 'createFxQuote',
      request: {
        params: Id,
        body: { content: { 'application/json': { schema: FxQuoteInputSchema } } },
      },
      responses: { 200: json(FxQuoteSchema), ...Errors },
    }),
    async (context) => {
      const principal = await actor(context);
      return context.json(
        await service().quote(
          context.req.valid('param').id,
          principal.id,
          context.req.valid('json'),
        ),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/fx/offers/{id}/fills',
      operationId: 'fillFxOffer',
      request: {
        params: Id,
        body: { content: { 'application/json': { schema: FxFillInputSchema } } },
      },
      responses: { 200: json(FxReceiptSchema), ...Errors },
    }),
    async (context) => {
      const principal = await actor(context);
      return context.json(
        await service().fill(
          context.req.valid('param').id,
          principal.id,
          context.req.valid('json'),
        ),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/fx/offers/{id}/expire',
      operationId: 'recordFxOfferExpiry',
      request: { params: Id },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      const principal = await actor(context);
      await service().expire(context.req.valid('param').id, principal.id);
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/fx/exchanges',
      operationId: 'getFxExchangeHistory',
      request: { query: Page },
      responses: { 200: json(FxReceiptListSchema), ...Errors },
    }),
    async (context) => {
      const principal = await actor(context);
      return context.json(
        await service().history(principal.id, context.req.valid('query').page),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/fx/exchanges/{id}',
      operationId: 'getFxExchange',
      request: { params: Id },
      responses: { 200: json(FxReceiptSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await service().receipt(context.req.valid('param').id, await actor(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{id}/fx',
      operationId: 'getStateFx',
      request: { params: Id, query: Page },
      responses: { 200: json(StateFxSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await service().state(
          context.req.valid('param').id,
          await actor(context),
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  return app;
}
export { fxRoutes };
