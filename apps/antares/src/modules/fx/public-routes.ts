import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { json } from '../platform/routes';
import { HTTP } from '../errors';
import { PublicFxService } from './public';
import {
  FxBankIdentitySchema,
  FxOfferSchema,
  FxOfferListSchema,
  FxOfferFillListSchema,
} from './read-contracts';
import { Id, Page, FxOfferSearchSchema, Errors, fxDatabase } from './route-contracts';

// oxlint-disable-next-line max-lines-per-function -- Published OpenAPI declarations delegate only to explicit cookie-free read projections.
function publicFxRoutes(db: Database['db'] | undefined): OpenAPIHono {
  const app = new OpenAPIHono();
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/fx/banks/{id}',
      operationId: 'getFxBank',
      request: { params: Id },
      responses: { 200: json(FxBankIdentitySchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await new PublicFxService(fxDatabase(db)).bank(context.req.valid('param').id),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/fx/offers',
      operationId: 'listFxOffers',
      request: { query: FxOfferSearchSchema },
      responses: { 200: json(FxOfferListSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await new PublicFxService(fxDatabase(db)).list(
          context.req.valid('query').page,
          context.req.valid('query'),
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/fx/offers/{id}',
      operationId: 'getFxOffer',
      request: { params: Id },
      responses: { 200: json(FxOfferSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await new PublicFxService(fxDatabase(db)).detail(context.req.valid('param').id),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/fx/offers/{id}/fills',
      operationId: 'listPublicFxOfferFills',
      request: { params: Id, query: Page },
      responses: { 200: json(FxOfferFillListSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await new PublicFxService(fxDatabase(db)).fills(
          context.req.valid('param').id,
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  return app;
}
export { publicFxRoutes };
