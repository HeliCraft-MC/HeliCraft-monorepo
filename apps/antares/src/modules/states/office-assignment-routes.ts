import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { OfficeAssignmentService } from './office-assignment-service';
import {
  OfficeAssignmentDetailSchema,
  OfficeAssignmentInputSchema,
} from './office-assignment-contracts';
import type { OfficeAssignmentActor } from './office-assignment-contracts';

const Id = z.object({ id: z.uuid() });
const StateId = z.object({ stateId: z.uuid() });
const Success = z.object({ success: z.literal(true) });
const MAX_REASON = 2000;
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- Typed office-decision HTTP declarations delegate all authority and lifecycle work to the service.
function officeAssignmentRoutes(
  db: Database['db'] | undefined,
  secureCookies: boolean,
): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  async function actor(context: Context): Promise<OfficeAssignmentActor> {
    const principal = await authenticate(context);
    return { id: principal.id, admin: principal.permissions.includes('states.manage') };
  }
  function service(): OfficeAssignmentService {
    if (db === undefined) {
      throw new DomainError(
        HTTP.unavailable,
        'STATES_UNAVAILABLE',
        'Государства временно недоступны',
      );
    }
    return new OfficeAssignmentService(db);
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/states/{stateId}/office-assignments',
      operationId: 'listOfficeAssignments',
      request: { params: StateId },
      responses: { 200: json(z.object({ ids: z.array(z.uuid()) })), ...Errors },
    }),
    async (context) =>
      context.json(
        { ids: await service().list(context.req.valid('param').stateId, await actor(context)) },
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/states/{stateId}/office-assignments',
      operationId: 'createOfficeAssignment',
      request: {
        params: StateId,
        body: { content: { 'application/json': { schema: OfficeAssignmentInputSchema } } },
      },
      responses: { 200: json(Id), ...Errors },
    }),
    async (context) =>
      context.json(
        {
          id: await service().create(
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
      path: '/account/office-assignments/{id}',
      operationId: 'getOfficeAssignment',
      request: { params: Id },
      responses: { 200: json(OfficeAssignmentDetailSchema), ...Errors },
    }),
    async (context) =>
      context.json(
        await service().detail(context.req.valid('param').id, await actor(context)),
        HTTP.ok,
      ),
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/office-assignments/{id}/approve/{officeId}',
      operationId: 'approveOfficeAssignment',
      request: { params: Id.extend({ officeId: z.uuid() }) },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      const input = context.req.valid('param');
      await service().approve(input.id, await actor(context), input.officeId);
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/office-assignments/{id}/apply',
      operationId: 'applyOfficeAssignment',
      request: {
        params: Id,
        body: {
          content: {
            'application/json': {
              schema: z.object({ reason: z.string().trim().max(MAX_REASON).optional() }),
            },
          },
        },
      },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await service().apply(
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
      path: '/account/office-assignments/{id}/cancel',
      operationId: 'cancelOfficeAssignment',
      request: { params: Id },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      await service().cancel(context.req.valid('param').id, await actor(context));
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  return app;
}
export { officeAssignmentRoutes };
