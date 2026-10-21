import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { RateLimiter } from '../sessions/security';
import { DomainError, HTTP } from '../errors';
import { CompanyDraftService } from './drafts';
import { CompanyConsentService } from './consents';
import { CompanyRegistrationService } from './registration';
import {
  CompanyDraftSchema,
  CompanyDraftSaveSchema,
  CompanySubmitSchema,
  CompanyRegistrationReviewSchema,
  CompanyPersonalConsentSchema,
  CompanyPersonalConsentViewSchema,
} from './registration-contracts';

const MUTATIONS_PER_WINDOW = 300;
const MAX_TITLE_LENGTH = 200;
const Id = z.object({ id: z.uuid() });
const Version = z.object({ version: z.number().int().min(1) }).strict();
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
// oxlint-disable-next-line max-lines-per-function -- OpenAPI declarations delegate every registration command and access check to domain services.
function companyRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  const limiter = new RateLimiter();
  async function actorId(context: Context): Promise<string> {
    const principal = await authenticate(context);
    if (context.req.method !== 'GET') {
      limiter.take(`companies:${principal.id}`, MUTATIONS_PER_WINDOW);
    }
    return principal.id;
  }
  function services(): {
    drafts: CompanyDraftService;
    consents: CompanyConsentService;
    registration: CompanyRegistrationService;
  } {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'COMPANIES_UNAVAILABLE',
        'Регистрация компаний временно недоступна',
      );
    }
    return {
      drafts: new CompanyDraftService(db),
      consents: new CompanyConsentService(db),
      registration: new CompanyRegistrationService(db),
    };
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/company-drafts/{id}/consents',
      operationId: 'listCompanyFormationConsents',
      request: { params: Id },
      responses: {
        200: json(z.object({ items: z.array(CompanyPersonalConsentViewSchema) })),
        ...Errors,
      },
    }),
    async (context) =>
      context.json(
        {
          items: await services().consents.list(
            context.req.valid('param').id,
            await actorId(context),
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/company-drafts',
      operationId: 'listCompanyDrafts',
      responses: { 200: json(z.object({ items: z.array(CompanyDraftSchema) })), ...Errors },
    }),
    async (context) =>
      context.json({ items: await services().drafts.list(await actorId(context)) }, HTTP.ok),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/companies/{id}/formation',
      operationId: 'getCompanyFormationProject',
      request: { params: Id },
      responses: { 200: json(CompanyDraftSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().drafts.byCompany(context.req.valid('param').id, await actorId(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/company-drafts',
      operationId: 'createCompanyDraft',
      request: {
        body: {
          content: {
            'application/json': {
              schema: z
                .object({ title: z.string().trim().max(MAX_TITLE_LENGTH).default('') })
                .strict(),
            },
          },
        },
      },
      responses: { 200: json(CompanyDraftSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().drafts.create(await actorId(context), context.req.valid('json').title),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/company-drafts/{id}',
      operationId: 'getCompanyDraft',
      request: { params: Id },
      responses: { 200: json(CompanyDraftSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().drafts.get(context.req.valid('param').id, await actorId(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'put',
      path: '/account/company-drafts/{id}',
      operationId: 'saveCompanyDraft',
      request: {
        params: Id,
        body: { content: { 'application/json': { schema: CompanyDraftSaveSchema } } },
      },
      responses: { 200: json(CompanyDraftSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().drafts.save(
          context.req.valid('param').id,
          await actorId(context),
          context.req.valid('json'),
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'delete',
      path: '/account/company-drafts/{id}',
      operationId: 'deleteCompanyDraft',
      request: { params: Id, body: { content: { 'application/json': { schema: Version } } } },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().drafts.remove(
        context.req.valid('param').id,
        await actorId(context),
        context.req.valid('json').version,
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/company-drafts/{id}/reopen',
      operationId: 'reopenCompanyDraft',
      request: { params: Id },
      responses: { 200: json(CompanyDraftSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().drafts.reopen(context.req.valid('param').id, await actorId(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/company-drafts/{id}/review',
      operationId: 'reviewCompanyRegistration',
      request: { params: Id },
      responses: { 200: json(CompanyRegistrationReviewSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().registration.review(context.req.valid('param').id, await actorId(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/company-drafts/{id}/submit',
      operationId: 'submitCompanyRegistration',
      request: {
        params: Id,
        body: { content: { 'application/json': { schema: CompanySubmitSchema } } },
      },
      responses: { 200: json(Id), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          id: await services().registration.submit(
            context.req.valid('param').id,
            await actorId(context),
            context.req.valid('json'),
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/company-drafts/{id}/consents',
      operationId: 'consentToCompanyFormation',
      request: {
        params: Id,
        body: { content: { 'application/json': { schema: CompanyPersonalConsentSchema } } },
      },
      responses: { 200: json(Id), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          id: await services().consents.grant(
            context.req.valid('param').id,
            await actorId(context),
            context.req.valid('json'),
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/company-consents/{id}/revoke',
      operationId: 'revokeCompanyFormationConsent',
      request: { params: Id },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await services().consents.revoke(context.req.valid('param').id, await actorId(context));
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  return app;
}
export { companyRoutes };
