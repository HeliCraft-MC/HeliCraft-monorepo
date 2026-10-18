// oxlint-disable max-lines -- Cohesive typed API registration; business logic lives in dedicated domain modules.
// oxlint-disable max-lines-per-function, max-statements -- Typed HTTP declarations delegate decisions, authorization and financial execution to domain services.
// oxlint-disable import/max-dependencies -- The API composes taxation/diplomacy services, shared contracts and platform authentication.
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { RateLimiter } from '../sessions/security';
import { DomainError, HTTP } from '../errors';
import { LocaleSchema } from '../localized-content/contracts';
import {
  WalletTransferSchema,
  DirectiveDetailSchema,
  PositiveMinorSchema,
  BankStatusSchema,
} from '../monetary/contracts';
import type { MonetaryActor } from '../monetary/contracts';
import { MonetaryService } from '../monetary/service';
import { DiplomacyService } from '../diplomacy/service';
import { TreatyDraftSchema, TreatyEditSchema } from '../diplomacy/contracts';
import { TreatySchema, PublicTreatySchema, TreatyHistorySchema } from '../diplomacy/read-contracts';
import { TaxationService } from './service';
import { TaxOfficeModerationService } from './moderation';
import {
  TaxOfficeSchema,
  StateTaxationSchema,
  PublicTaxationSchema,
  PublicLawRevisionSchema,
  EconomicOperationSchema,
} from './read-contracts';
import { TransferQuoteSchema, TaxRuleSchema } from './contracts';
import { percentage } from './engine';
import { taxBaseMinor } from './rule';

const MAX_HISTORY_PAGE = 1_000_000;
const MAX_REASON_LENGTH = 2000;
const MUTATIONS_PER_WINDOW = 300;
const Id = z.object({ id: z.uuid() });
const StateId = z.object({ stateId: z.uuid() });
const LocaleQuery = z.object({ locale: LocaleSchema.default('ru') });
const PageQuery = z.object({
  page: z.coerce.number().int().min(1).max(MAX_HISTORY_PAGE).default(1),
});
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
// oxlint-disable-next-line max-lines-per-function, max-statements -- OpenAPI declarations delegate all domain operations.
function taxationRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  const limiter = new RateLimiter();
  async function actor(context: Context): Promise<MonetaryActor> {
    const principal = await authenticate(context);
    if (context.req.method !== 'GET') {
      limiter.take(`taxation:${principal.id}`, MUTATIONS_PER_WINDOW);
    }
    return { id: principal.id, admin: principal.permissions.includes('states.manage') };
  }
  async function actorId(context: Context): Promise<string> {
    const principal = await actor(context);
    return principal.id;
  }
  function services(): {
    tax: TaxationService;
    diplomacy: DiplomacyService;
    money: MonetaryService;
    moderation: TaxOfficeModerationService;
  } {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'TAXATION_UNAVAILABLE',
        'Налоги и дипломатия временно недоступны',
      );
    }
    return {
      tax: new TaxationService(db),
      diplomacy: new DiplomacyService(db),
      money: new MonetaryService(db),
      moderation: new TaxOfficeModerationService(db),
    };
  }
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/wallet/quotes',
      operationId: 'quoteWalletTransfer',
      request: {
        body: {
          content: { 'application/json': { schema: WalletTransferSchema.omit({ quoteId: true }) } },
        },
      },
      responses: { 200: json(TransferQuoteSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().money.quote(await actorId(context), context.req.valid('json')),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/economic-operations/{id}',
      operationId: 'getEconomicOperation',
      request: { params: Id },
      responses: { 200: json(EconomicOperationSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().tax.operation(context.req.valid('param').id, await actorId(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{stateId}/taxation',
      operationId: 'getStateTaxation',
      request: { params: StateId, query: PageQuery },
      responses: { 200: json(StateTaxationSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().tax.state(
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
      path: '/account/taxation/example',
      operationId: 'previewTaxRule',
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({ amountMinor: PositiveMinorSchema, rule: TaxRuleSchema }).strict(),
            },
          },
        },
      },
      responses: {
        200: json(
          z.object({
            amountMinor: z.string(),
            baseMinor: z.string(),
            totalDebitMinor: z.string(),
            recipientCreditMinor: z.string(),
          }),
        ),
        ...Errors,
      },
    }),
    async (context) => {
      await actor(context);
      const input = context.req.valid('json');
      const principal = BigInt(input.amountMinor);
      const base = taxBaseMinor(principal, input.rule);
      const tax = percentage(base, input.rule.rateBps);
      return context.json(
        {
          amountMinor: tax.toString(),
          baseMinor: base.toString(),
          totalDebitMinor: (principal + (input.rule.taxpayer === 'SENDER' ? tax : 0n)).toString(),
          recipientCreditMinor: (
            principal - (input.rule.taxpayer === 'RECIPIENT' ? tax : 0n)
          ).toString(),
        },
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/tax-offices',
      operationId: 'listAdminTaxOffices',
      responses: { 200: json(z.object({ items: z.array(TaxOfficeSchema) })), ...Errors },
    }),
    async (context) =>
      context.json({ items: await services().moderation.list(await actorId(context)) }, HTTP.ok),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/tax-offices/{id}/review',
      operationId: 'reviewTaxOffice',
      request: {
        params: Id,
        body: {
          content: {
            'application/json': {
              schema: z
                .object({
                  directiveId: z.uuid(),
                  status: BankStatusSchema,
                  reason: z.string().trim().min(1).max(MAX_REASON_LENGTH),
                })
                .strict(),
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
      path: '/account/states/{stateId}/diplomacy',
      operationId: 'getStateDiplomacy',
      request: { params: StateId, query: PageQuery },
      responses: {
        200: json(
          z.object({
            items: z.array(TreatySchema),
            directives: z.array(DirectiveDetailSchema),
            page: z.number().int(),
            hasMore: z.boolean(),
          }),
        ),
        ...Errors,
      },
    }),
    async (context) =>
      context.json(
        await services().diplomacy.state(
          context.req.valid('param').stateId,
          await actor(context),
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{stateId}/treaties/{id}/revisions',
      operationId: 'getTreatyRevisionHistory',
      request: { params: StateId.extend(Id.shape), query: PageQuery },
      responses: { 200: json(TreatyHistorySchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().diplomacy.history(
          context.req.valid('param').stateId,
          await actor(context),
          { treatyId: context.req.valid('param').id, page: context.req.valid('query').page },
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/states/{stateId}/treaties',
      operationId: 'createTreatyDraft',
      request: {
        params: StateId,
        body: { content: { 'application/json': { schema: TreatyDraftSchema } } },
      },
      responses: { 200: json(Id), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          id: await services().diplomacy.create(
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
      method: 'put',
      path: '/account/states/{stateId}/treaties/{id}',
      operationId: 'editTreatyDraft',
      request: {
        params: StateId.extend(Id.shape),
        body: { content: { 'application/json': { schema: TreatyEditSchema } } },
      },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().diplomacy.edit(
        context.req.valid('param').stateId,
        context.req.valid('param').id,
        await actor(context),
        context.req.valid('json'),
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/states/{stateId}/treaties/{id}/submit',
      operationId: 'submitTreatyDraft',
      request: {
        params: StateId.extend(Id.shape),
        body: {
          content: { 'application/json': { schema: z.object({ revisionId: z.uuid() }).strict() } },
        },
      },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().diplomacy.submit(
        context.req.valid('param').stateId,
        context.req.valid('param').id,
        await actor(context),
        context.req.valid('json').revisionId,
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/states/{stateId}/taxation',
      operationId: 'getPublicTaxation',
      request: { params: StateId, query: LocaleQuery },
      responses: { 200: json(PublicTaxationSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().tax.publicState(
          context.req.valid('param').stateId,
          context.req.valid('query').locale,
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/tax-laws/{id}',
      operationId: 'getPublicTaxLaw',
      request: { params: Id, query: LocaleQuery.extend(PageQuery.shape) },
      responses: {
        200: json(
          z.object({
            revisions: z.array(PublicLawRevisionSchema),
            page: z.number().int(),
            hasMore: z.boolean(),
          }),
        ),
        ...Errors,
      },
    }),
    async (context) =>
      context.json(
        await services().tax.publicLaw(
          context.req.valid('param').id,
          context.req.valid('query').locale,
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/treaties',
      operationId: 'listPublicTreaties',
      request: { query: LocaleQuery.extend(PageQuery.shape) },
      responses: {
        200: json(
          z.object({
            items: z.array(PublicTreatySchema),
            page: z.number().int(),
            hasMore: z.boolean(),
          }),
        ),
        ...Errors,
      },
    }),
    async (context) =>
      context.json(
        await services().diplomacy.publicList(
          context.req.valid('query').locale,
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/treaties/{id}',
      operationId: 'getPublicTreaty',
      request: { params: Id, query: LocaleQuery.extend(PageQuery.shape) },
      responses: { 200: json(PublicTreatySchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().diplomacy.publicTreaty(
          context.req.valid('param').id,
          context.req.valid('query').locale,
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  return app;
}
export { taxationRoutes };
