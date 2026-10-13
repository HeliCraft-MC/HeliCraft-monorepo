import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { json, authenticator } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { LocaleSchema } from '../localized-content/contracts';
import { readReformProposal, readProposal, listReformProposals } from './proposals';
import { StateConfigurationSchema, ReformProposalSchema } from './contracts';
import { StateReformService } from './reforms';

const ProposalSummary = z.object({
  id: z.uuid(),
  version: z.number(),
  createdAt: z.iso.datetime(),
});
const Id = z.object({ id: z.uuid() });
const Version = z.object({ version: z.number().int().min(1) });
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- Typed reform route declarations delegate all policy checks to services.
function stateReformRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  async function actorId(context: Context): Promise<string> {
    const principal = await authenticate(context);
    return principal.id;
  }
  function service(): StateReformService {
    if (!db) {
      throw new DomainError(HTTP.unavailable, 'STATES_UNAVAILABLE', 'Государства недоступны');
    }
    return new StateReformService(db);
  }
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/states/{id}/drafts',
      operationId: 'createStateReformDraft',
      request: { params: Id },
      responses: { 200: json(z.object({ draftId: z.uuid() })), ...Errors },
    }),
    async (context) =>
      context.json(
        { draftId: await service().create(context.req.valid('param').id, await actorId(context)) },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/state-drafts/{id}/vote',
      operationId: 'startStateReformVote',
      request: { params: Id, body: { content: { 'application/json': { schema: Version } } } },
      responses: { 200: json(z.object({ votingId: z.uuid() })), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          votingId: await service().startVote(
            context.req.valid('param').id,
            await actorId(context),
            context.req.valid('json').version,
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/state-drafts/{id}/approve-office',
      operationId: 'approveStateReformOffice',
      request: {
        params: Id,
        body: {
          content: {
            'application/json': {
              schema: z.object({
                version: z.number().int().min(1),
                ownerId: z.uuid(),
                officeId: z.uuid(),
              }),
            },
          },
        },
      },
      responses: { 200: json(z.object({ success: z.literal(true) })), ...Errors },
    }),
    async (context) => {
      const input = context.req.valid('json');
      await service().approveOffice(
        { ...input, draftId: context.req.valid('param').id },
        await actorId(context),
      );
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/state-drafts/{id}/publish',
      operationId: 'publishStateReform',
      request: { params: Id, body: { content: { 'application/json': { schema: Version } } } },
      responses: { 200: json(z.object({ revisionId: z.uuid() })), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          revisionId: await service().publish(
            context.req.valid('param').id,
            await actorId(context),
            context.req.valid('json').version,
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/states/{id}/revision',
      operationId: 'adminOverrideState',
      request: {
        params: Id,
        body: {
          content: {
            'application/json': {
              schema: z.object({
                configuration: StateConfigurationSchema,
                reason: z.string().trim().min(1),
                baseRevisionId: z.uuid(),
              }),
            },
          },
        },
      },
      responses: { 200: json(z.object({ revisionId: z.uuid() })), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          revisionId: await service().adminOverride(
            { ...context.req.valid('json'), stateId: context.req.valid('param').id },
            await actorId(context),
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/state-reform-votes/{id}/proposal',
      operationId: 'getStateReformProposal',
      request: { params: Id, query: z.object({ locale: LocaleSchema.default('ru') }) },
      responses: { 200: json(ReformProposalSchema), ...Errors },
    }),
    async (context) => {
      const actor = await actorId(context);
      if (!db) {
        throw new DomainError(HTTP.unavailable, 'STATES_UNAVAILABLE', 'Государства недоступны');
      }
      return context.json(
        await readReformProposal(db, {
          votingId: context.req.valid('param').id,
          actorId: actor,
          locale: context.req.valid('query').locale,
        }),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/state-drafts/{id}/propose',
      operationId: 'proposeStateReform',
      request: { params: Id, body: { content: { 'application/json': { schema: Version } } } },
      responses: { 200: json(z.object({ proposalId: z.uuid() })), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          proposalId: await service().propose(
            context.req.valid('param').id,
            await actorId(context),
            context.req.valid('json').version,
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{id}/proposals',
      operationId: 'listStateReformProposals',
      request: { params: Id },
      responses: {
        200: json(
          z.object({
            items: z.array(ProposalSummary),
          }),
        ),
        ...Errors,
      },
    }),
    async (context) => {
      const actor = await authenticate(context);
      if (!db) {
        throw new DomainError(HTTP.unavailable, 'STATES_UNAVAILABLE', 'Государства недоступны');
      }
      const items = await listReformProposals(db, context.req.valid('param').id, actor.id);
      return context.json({ items }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/state-reform-proposals/{id}',
      operationId: 'getStateReformProposalById',
      request: { params: Id, query: z.object({ locale: LocaleSchema.default('ru') }) },
      responses: { 200: json(ReformProposalSchema), ...Errors },
    }),
    async (context) => {
      const actor = await actorId(context);
      if (!db) {
        throw new DomainError(HTTP.unavailable, 'STATES_UNAVAILABLE', 'Государства недоступны');
      }
      return context.json(
        await readProposal(db, {
          proposalId: context.req.valid('param').id,
          actorId: actor,
          locale: context.req.valid('query').locale,
        }),
        HTTP.ok,
      );
    },
  );
  return app;
}
export { stateReformRoutes };
