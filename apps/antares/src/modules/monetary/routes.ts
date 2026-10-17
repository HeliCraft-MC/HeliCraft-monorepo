// oxlint-disable import/max-dependencies -- Typed HTTP composition reuses the platform limiter and domain-specific services.
// oxlint-disable max-lines -- Cohesive monetary OpenAPI declarations expose typed operations; services own all accounting and authority.
// oxlint-disable max-lines-per-function, max-statements -- Typed OpenAPI declarations delegate all lifecycle, accounting and authorization to services.
import { TreatyContentSchema } from '../diplomacy/contracts';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { RateLimiter } from '../sessions/security';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { MonetaryDirectiveService } from './directives';
import { MonetaryService } from './service';
import { MonetaryReviewService } from './review';
import { BankModerationService } from './moderation';
import {
  DirectivePayloadSchema,
  DirectiveInputSchema,
  DirectiveDetailSchema,
  BankSchema,
  BankStatusSchema,
  StateMonetarySchema,
  WalletSchema,
  WalletTransferSchema,
  PublicCurrencySchema,
} from './contracts';
import type { MonetaryActor } from './contracts';

const Id = z.object({ id: z.uuid() });
const StateId = z.object({ stateId: z.uuid() });
const MONETARY_MUTATIONS_PER_WINDOW = 300;
const MAX_HISTORY_PAGE = 1_000_000;
const MAX_CURRENCY_CODE = 12;
const PageQuery = z.object({
  page: z.coerce.number().int().min(1).max(MAX_HISTORY_PAGE).default(1),
});
const Success = z.object({ success: z.literal(true) });
const MAX_REASON_LENGTH = 2000;
const Reason = z.string().trim().min(1).max(MAX_REASON_LENGTH);
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  429: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
function monetaryRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  const limiter = new RateLimiter();
  async function actor(context: Context): Promise<MonetaryActor> {
    const principal = await authenticate(context);
    if (context.req.method !== 'GET') {
      limiter.take(`monetary:${principal.id}`, MONETARY_MUTATIONS_PER_WINDOW);
    }
    return { id: principal.id, admin: principal.permissions.includes('states.manage') };
  }
  async function actorId(context: Context): Promise<string> {
    const principal = await actor(context);
    return principal.id;
  }
  function services(): {
    directives: MonetaryDirectiveService;
    money: MonetaryService;
    moderation: BankModerationService;
    review: MonetaryReviewService;
  } {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'MONETARY_UNAVAILABLE',
        'Денежная система временно недоступна',
      );
    }
    return {
      directives: new MonetaryDirectiveService(db),
      money: new MonetaryService(db),
      moderation: new BankModerationService(db),
      review: new MonetaryReviewService(db),
    };
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/monetary/directives',
      operationId: 'listAdminMonetaryDirectives',
      responses: { 200: json(z.object({ items: z.array(DirectiveDetailSchema) })), ...Errors },
    }),
    async (context) =>
      context.json({ items: await services().review.pending(await actorId(context)) }, HTTP.ok),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/votings/{id}/monetary-directive',
      operationId: 'getMonetaryVotingPayload',
      request: { params: Id },
      responses: {
        200: json(
          z.object({
            payload: DirectivePayloadSchema,
            payloadHash: z.string(),
            code: z.string(),
            treatyContent: TreatyContentSchema.nullable().openapi('OptionalTreatyContent'),
          }),
        ),
        ...Errors,
      },
    }),
    async (context) =>
      context.json(
        await services().review.votingPayload(context.req.valid('param').id, await actor(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{stateId}/monetary',
      operationId: 'getStateMonetary',
      request: { params: StateId, query: PageQuery },
      responses: { 200: json(StateMonetarySchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().money.state(
          context.req.valid('param').stateId,
          await actor(context),
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/states/{stateId}/monetary/directives',
      operationId: 'createMonetaryDirective',
      request: {
        params: StateId,
        body: { content: { 'application/json': { schema: DirectiveInputSchema } } },
      },
      responses: { 200: json(Id), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          id: await services().directives.create(
            context.req.valid('param').stateId,
            await actor(context),
            context.req.valid('json'),
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/monetary/directives/{id}',
      operationId: 'getMonetaryDirective',
      request: { params: Id },
      responses: { 200: json(DirectiveDetailSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().directives.detail(context.req.valid('param').id, await actor(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/monetary/directives/{id}/approve/{officeId}',
      operationId: 'approveMonetaryDirective',
      request: { params: Id.extend({ officeId: z.uuid() }) },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().directives.approve(
        context.req.valid('param').id,
        await actor(context),
        context.req.valid('param').officeId,
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/monetary/directives/{id}/revoke/{officeId}',
      operationId: 'revokeMonetaryApproval',
      request: { params: Id.extend({ officeId: z.uuid() }) },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().directives.revoke(
        context.req.valid('param').id,
        await actor(context),
        context.req.valid('param').officeId,
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/monetary/directives/{id}/apply',
      operationId: 'applyMonetaryDirective',
      request: {
        params: Id,
        body: {
          content: { 'application/json': { schema: z.object({ reason: Reason.optional() }) } },
        },
      },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().directives.apply(
        context.req.valid('param').id,
        await actor(context),
        context.req.valid('json').reason,
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/monetary/directives/{id}/cancel',
      operationId: 'cancelMonetaryDirective',
      request: { params: Id },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().directives.cancel(context.req.valid('param').id, await actor(context));
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/wallet',
      operationId: 'getWallet',
      request: { query: PageQuery },
      responses: { 200: json(WalletSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().money.wallet(await actorId(context), context.req.valid('query').page),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/wallet/transfers',
      operationId: 'transferWallet',
      request: { body: { content: { 'application/json': { schema: WalletTransferSchema } } } },
      responses: { 200: json(Id), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          id: await services().money.transfer(await actorId(context), context.req.valid('json')),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/central-banks',
      operationId: 'listAdminCentralBanks',
      request: { query: z.object({ status: BankStatusSchema.optional() }) },
      responses: { 200: json(z.object({ items: z.array(BankSchema) })), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          items: await services().moderation.list(
            await actorId(context),
            context.req.valid('query').status,
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/central-banks/{id}/review',
      operationId: 'reviewCentralBank',
      request: {
        params: Id,
        body: {
          content: {
            'application/json': {
              schema: z.object({ directiveId: z.uuid(), status: BankStatusSchema, reason: Reason }),
            },
          },
        },
      },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().moderation.review(
        context.req.valid('param').id,
        await actorId(context),
        context.req.valid('json'),
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/currencies',
      operationId: 'listPublicCurrencies',
      request: { query: z.object({ after: z.string().max(MAX_CURRENCY_CODE).optional() }) },
      responses: {
        200: json(
          z.object({ items: z.array(PublicCurrencySchema), nextCode: z.string().nullable() }),
        ),
        ...Errors,
      },
    }),
    async (context) =>
      context.json(
        await services().money.publicCurrencies(context.req.valid('query').after),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/currencies/{code}',
      operationId: 'getPublicCurrency',
      request: {
        params: z.object({ code: z.string().regex(/^[A-Z][A-Z0-9]{2,11}$/u) }),
        query: PageQuery,
      },
      responses: { 200: json(PublicCurrencySchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().money.publicCurrency(
          context.req.valid('param').code,
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  return app;
}
export { monetaryRoutes };
