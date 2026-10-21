import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import type { CompanyActor } from './decision-contracts';
import { CompanyBranchService } from './branches';
import { PublicCompanyBranchService } from './branch-public';
import {
  PublishedRegistrationPolicySchema,
  BranchListSchema,
  PublishedBranchListSchema,
  PublishedBranchSchema,
  BranchDetailSchema,
  BranchApplicationViewSchema,
} from './branch-read-contracts';

const Id = z.object({ id: z.uuid() });
const Application = z.object({ id: z.uuid(), applicationId: z.uuid() });
const MAX_PAGE = 1_000_000;
const Page = z.object({ page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1) });
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- Declarative OpenAPI readers keep public published metadata distinct from authenticated application and history access.
function branchRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  async function actor(context: Context): Promise<CompanyActor> {
    const principal = await authenticate(context);
    return { id: principal.id, admin: principal.permissions.includes('states.manage') };
  }
  function services(): { protected: CompanyBranchService; public: PublicCompanyBranchService } {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'COMPANY_BRANCHES_UNAVAILABLE',
        'Филиалы временно недоступны',
      );
    }
    return { protected: new CompanyBranchService(db), public: new PublicCompanyBranchService(db) };
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/company-branches/{id}',
      operationId: 'getPublishedCompanyBranch',
      request: { params: Id },
      responses: { 200: json(PublishedBranchSchema), ...Errors },
    }),
    async (context) =>
      context.json(await services().public.detail(context.req.valid('param').id), HTTP.ok),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/states/{id}/company-registration-policy',
      operationId: 'getPublishedCompanyRegistrationPolicy',
      request: { params: Id },
      responses: { 200: json(z.union([PublishedRegistrationPolicySchema, z.null()])), ...Errors },
    }),
    async (context) =>
      context.json(await services().public.policy(context.req.valid('param').id), HTTP.ok),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/companies/{id}/branches',
      operationId: 'listPublishedCompanyBranches',
      request: { params: Id, query: Page },
      responses: { 200: json(PublishedBranchListSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().public.company(
          context.req.valid('param').id,
          context.req.valid('query').page,
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/companies/{id}/branches',
      operationId: 'listCompanyBranches',
      request: { params: Id, query: Page },
      responses: { 200: json(BranchListSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().protected.company(
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
      path: '/account/states/{id}/company-branches',
      operationId: 'listStateCompanyBranches',
      request: { params: Id, query: Page },
      responses: { 200: json(BranchListSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().protected.state(
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
      path: '/account/company-branches/{id}',
      operationId: 'getCompanyBranch',
      request: { params: Id, query: Page },
      responses: { 200: json(BranchDetailSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().protected.detail(
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
      path: '/account/company-branches/{id}/applications/{applicationId}',
      operationId: 'getCompanyBranchApplication',
      request: { params: Application },
      responses: { 200: json(BranchApplicationViewSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().protected.application(
          context.req.valid('param').id,
          context.req.valid('param').applicationId,
          await actor(context),
        ),
        HTTP.ok,
      ),
  );
  return app;
}
export { branchRoutes };
