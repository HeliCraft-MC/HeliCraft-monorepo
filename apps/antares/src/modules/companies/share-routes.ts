// oxlint-disable import/max-dependencies -- Typed ownership routes compose session authentication, immutable terms, personal consent and real stock settlement services.
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { RateLimiter } from '../sessions/security';
import { DomainError, HTTP } from '../errors';
import { ShareOperationService } from './share-operations';
import { ShareConsentService } from './share-consents';
import { PersonalShareService } from './share-settlement';
import { SharePortfolioService } from './share-portfolio';
import { ShareHistoryService } from './share-history';
import type { CompanyActor } from './decision-contracts';
import {
  ShareOperationInputSchema,
  ShareConsentInputSchema,
  PersonalShareTransferSchema,
} from './ownership-contracts';
import {
  ShareOperationViewSchema,
  SharePortfolioSchema,
  ShareHistorySchema,
} from './share-read-contracts';

const MUTATIONS_PER_WINDOW = 300;
const MAX_PAGE = 1_000_000;
const Id = z.object({ id: z.uuid() });
const Page = z.object({ page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1) });
const Success = z.object({ success: z.literal(true) });
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  429: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- Related typed stock routes delegate all authorization, consent and journal invariants to domain services.
function shareRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  const limiter = new RateLimiter();
  async function actor(context: Context): Promise<CompanyActor> {
    const principal = await authenticate(context);
    if (context.req.method !== 'GET') {
      limiter.take(`shares:${principal.id}`, MUTATIONS_PER_WINDOW);
    }
    return { id: principal.id, admin: principal.permissions.includes('states.manage') };
  }
  async function actorId(context: Context): Promise<string> {
    const principal = await actor(context);
    return principal.id;
  }
  function services(): {
    operations: ShareOperationService;
    consents: ShareConsentService;
    transfers: PersonalShareService;
    portfolio: SharePortfolioService;
    history: ShareHistoryService;
  } {
    if (!db) {
      throw new DomainError(HTTP.unavailable, 'SHARES_UNAVAILABLE', 'Акции временно недоступны');
    }
    return {
      operations: new ShareOperationService(db),
      consents: new ShareConsentService(db),
      transfers: new PersonalShareService(db),
      portfolio: new SharePortfolioService(db),
      history: new ShareHistoryService(db),
    };
  }
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/share-operations',
      operationId: 'prepareShareOperation',
      request: { body: { content: { 'application/json': { schema: ShareOperationInputSchema } } } },
      responses: { 200: json(Id), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          id: await services().operations.create(await actorId(context), context.req.valid('json')),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/share-operations/{id}',
      operationId: 'getShareOperation',
      request: { params: Id },
      responses: { 200: json(ShareOperationViewSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().operations.get(context.req.valid('param').id, await actorId(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/share-consents',
      operationId: 'consentToShareAcquisition',
      request: { body: { content: { 'application/json': { schema: ShareConsentInputSchema } } } },
      responses: { 200: json(Id), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          id: await services().consents.grant(await actorId(context), context.req.valid('json')),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/share-consents/{id}/revoke',
      operationId: 'revokeShareAcquisitionConsent',
      request: { params: Id },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().consents.revoke(context.req.valid('param').id, await actorId(context));
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/share-transfers',
      operationId: 'transferPersonalShares',
      request: {
        body: { content: { 'application/json': { schema: PersonalShareTransferSchema } } },
      },
      responses: { 200: json(Id), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          id: await services().transfers.transfer(
            await actorId(context),
            context.req.valid('json'),
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/shares',
      operationId: 'getPersonalSharePortfolio',
      request: { query: Page },
      responses: { 200: json(SharePortfolioSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().portfolio.personal(await actor(context), context.req.valid('query').page),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/companies/{id}/shares',
      operationId: 'getCompanySharePortfolio',
      request: { params: Id, query: Page },
      responses: { 200: json(SharePortfolioSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().portfolio.company(
          context.req.valid('param').id,
          await actor(context),
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{id}/shares',
      operationId: 'getStateSharePortfolio',
      request: { params: Id, query: Page },
      responses: { 200: json(SharePortfolioSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().portfolio.state(
          context.req.valid('param').id,
          await actor(context),
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/companies/{id}/share-history',
      operationId: 'getCompanyShareHistory',
      request: { params: Id, query: Page },
      responses: { 200: json(ShareHistorySchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().history.list(
          context.req.valid('param').id,
          await actor(context),
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  return app;
}
export { shareRoutes };
