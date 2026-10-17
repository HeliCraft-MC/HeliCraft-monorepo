// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
import type { Context } from 'hono';
import type { Database } from '../../db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import { DomainError, HTTP } from '../errors';
import { json, authenticator } from '../platform/routes';
import { LocaleSchema } from '../localized-content/contracts';
import { previewConstitution } from './constitution-preview';
import { StateDraftService } from './drafts';
import { leaveState } from './citizenship';
import { StateService } from './service';
import { PRESETS, applyPreset } from './presets';
import {
  DraftSchema,
  SaveDraftSchema,
  StateDetailSchema,
  IssueSchema,
  GovernanceSchema,
  StateConfigurationSchema,
  RevisionSchema,
  StateListSchema,
} from './contracts';

const PreviewHtml = z.object({ id: z.uuid(), html: z.string() });
const Id = z.object({ id: z.uuid() });
const Version = z.object({ version: z.number().int().min(1) });
const Locale = z.object({ locale: LocaleSchema.default('ru'), revisionId: z.uuid().optional() });
const Success = z.object({ success: z.literal(true) });
const MAX_DRAFT_TITLE = 160;
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- This function declares typed HTTP routes; business rules remain in domain services.
function accountStateRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  async function actorId(context: Context): Promise<string> {
    const principal = await authenticate(context);
    return principal.id;
  }
  function services(): { drafts: StateDraftService; states: StateService; db: Database['db'] } {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'STATES_UNAVAILABLE',
        'Государства временно недоступны',
      );
    }
    return { db, drafts: new StateDraftService(db), states: new StateService(db) };
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states',
      operationId: 'listMyStates',
      responses: { 200: json(StateListSchema), ...Errors },
    }),
    async (context) => {
      const ownerId = await actorId(context);
      const items = await services().states.list(undefined, undefined, ownerId);
      return context.json({ items }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/states/{id}/leave',
      operationId: 'leaveState',
      request: { params: Id },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await leaveState(services().db, context.req.valid('param').id, await actorId(context));
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/state-drafts',
      operationId: 'listStateDrafts',
      responses: { 200: json(z.object({ items: z.array(DraftSchema) })), ...Errors },
    }),
    async (context) =>
      context.json({ items: await services().drafts.list(await actorId(context)) }, HTTP.ok),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/state-drafts',
      operationId: 'createStateDraft',
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({ title: z.string().max(MAX_DRAFT_TITLE).default('') }),
            },
          },
        },
      },
      responses: { 200: json(DraftSchema), ...Errors },
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
      path: '/account/state-drafts/{id}',
      operationId: 'getStateDraft',
      request: { params: Id },
      responses: { 200: json(DraftSchema), ...Errors },
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
      path: '/account/state-drafts/{id}',
      operationId: 'saveStateDraft',
      request: {
        params: Id,
        body: { content: { 'application/json': { schema: SaveDraftSchema } } },
      },
      responses: { 200: json(DraftSchema), ...Errors },
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
      path: '/account/state-drafts/{id}',
      operationId: 'deleteStateDraft',
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
      method: 'get',
      path: '/account/state-drafts/{id}/validation',
      operationId: 'validateStateDraft',
      request: { params: Id },
      responses: { 200: json(z.object({ issues: z.array(IssueSchema) })), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          issues: await services().states.validateDraft(
            context.req.valid('param').id,
            await actorId(context),
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/state-drafts/{id}/submit',
      operationId: 'submitStateDraft',
      request: { params: Id, body: { content: { 'application/json': { schema: Version } } } },
      responses: { 200: json(z.object({ stateId: z.uuid() })), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          stateId: await services().states.submit(
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
      path: '/account/state-presets/{preset}',
      operationId: 'getStatePreset',
      request: { params: z.object({ preset: z.enum(PRESETS) }) },
      responses: { 200: json(GovernanceSchema), ...Errors },
    }),
    async (context) =>
      context.json(applyPreset(context.req.valid('param').preset, await actorId(context)), HTTP.ok),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{id}',
      operationId: 'getOwnedState',
      request: { params: Id, query: Locale },
      responses: { 200: json(StateDetailSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().states.detail(
          context.req.valid('param').id,
          context.req.valid('query').locale,
          { actorId: await actorId(context), revisionId: context.req.valid('query').revisionId },
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{id}/revisions',
      operationId: 'listStateRevisions',
      request: { params: Id },
      responses: { 200: json(z.object({ items: z.array(RevisionSchema) })), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          items: await services().states.history(
            context.req.valid('param').id,
            await actorId(context),
            false,
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/states/constitution-preview',
      operationId: 'previewStateConstitution',
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({ configuration: StateConfigurationSchema, locale: LocaleSchema }),
            },
          },
        },
      },
      responses: {
        200: json(z.object({ html: z.array(PreviewHtml), warnings: z.array(z.string()) })),
        ...Errors,
      },
    }),
    async (context) => {
      const principal = await authenticate(context);
      const input = context.req.valid('json');
      const result = await previewConstitution(services().db, input.configuration, {
        principal,
        locale: input.locale,
      });
      return context.json(result, HTTP.ok);
    },
  );
  return app;
}
export { accountStateRoutes };
