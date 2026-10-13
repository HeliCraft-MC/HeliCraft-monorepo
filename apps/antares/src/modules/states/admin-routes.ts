import type { Context } from 'hono';
import type { Database } from '../../db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import { DomainError, HTTP } from '../errors';
import { json, authenticator } from '../platform/routes';
import { LocaleSchema } from '../localized-content/contracts';

import { StateDraftService } from './drafts';
import { StateService } from './service';

import { StateDetailSchema, StateStatusSchema, StateListSchema } from './contracts';

const Id = z.object({ id: z.uuid() });

const Locale = z.object({ locale: LocaleSchema.default('ru'), revisionId: z.uuid().optional() });
const Success = z.object({ success: z.literal(true) });
const MAX_REASON_LENGTH = 2000;
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- This function declares typed HTTP routes; business rules remain in domain services.
function adminStateRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  async function actorId(context: Context): Promise<string> {
    const principal = await authenticate(context);
    return principal.id;
  }
  function services(): { drafts: StateDraftService; states: StateService } {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'STATES_UNAVAILABLE',
        'Государства временно недоступны',
      );
    }
    return { drafts: new StateDraftService(db), states: new StateService(db) };
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/states',
      operationId: 'listAdminStates',
      request: { query: z.object({ status: StateStatusSchema.optional() }) },
      responses: {
        200: json(StateListSchema),
        ...Errors,
      },
    }),
    async (context) =>
      context.json(
        {
          items: await services().states.list(
            context.req.valid('query').status,
            await actorId(context),
          ),
        },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/states/{id}',
      operationId: 'getAdminState',
      request: { params: Id, query: Locale },
      responses: { 200: json(StateDetailSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await services().states.detail(
          context.req.valid('param').id,
          context.req.valid('query').locale,
          {
            actorId: await actorId(context),
            admin: true,
            revisionId: context.req.valid('query').revisionId,
          },
        ),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/states/{id}/status',
      operationId: 'changeStateStatus',
      request: {
        params: Id,
        body: {
          content: {
            'application/json': {
              schema: z.object({
                status: StateStatusSchema,
                reason: z.string().trim().min(1).max(MAX_REASON_LENGTH),
              }),
            },
          },
        },
      },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      const input = context.req.valid('json');
      await services().states.changeStatus(context.req.valid('param').id, await actorId(context), {
        status: input.status,
        reason: input.reason,
      });
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  return app;
}
export { adminStateRoutes };
