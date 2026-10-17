// oxlint-disable no-magic-numbers -- Pagination limits are part of the HTTP contract.
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { SurveyResponsesSchema } from './survey-contracts';
import { SurveyService } from './survey-service';

const Id = z.object({ id: z.uuid() });
const Success = z.object({ success: z.literal(true) });
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- OpenAPI registration keeps generated SDK operation names explicit.
function surveyRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  function service(): SurveyService {
    if (!db) {
      throw new DomainError(HTTP.unavailable, 'VOTING_UNAVAILABLE', 'Опросы временно недоступны');
    }
    return new SurveyService(db);
  }
  for (const action of ['close', 'reopen', 'archive'] as const) {
    app.openapi(
      createRoute({
        method: 'post',
        path: `/admin/votings/{id}/survey/${action}`,
        operationId: `${action}Survey`,
        request: {
          params: Id,
          body: {
            content: {
              'application/json': { schema: z.object({ closesAt: z.iso.datetime().optional() }) },
            },
          },
        },
        responses: { 200: json(Success), ...Errors },
      }),
      async (context) => {
        const actor = await authenticate(context);
        await service().action(context.req.valid('param').id, actor.id, {
          action,
          closesAt: context.req.valid('json').closesAt,
        });
        return context.json({ success: true as const }, HTTP.ok);
      },
    );
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/votings/{id}/responses',
      operationId: 'listSurveyResponses',
      request: {
        params: Id,
        query: z.object({
          page: z.coerce.number().int().min(1).max(1_000_000).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        }),
      },
      responses: { 200: json(SurveyResponsesSchema), ...Errors },
    }),
    async (context) => {
      const pagination = context.req.valid('query');
      const actor = await authenticate(context);
      return context.json(
        await service().responses(context.req.valid('param').id, actor.id, pagination),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'delete',
      path: '/admin/votings/{id}/responses/{responseId}',
      operationId: 'deleteSurveyResponse',
      request: { params: z.object({ id: z.uuid(), responseId: z.uuid() }) },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      const { id, responseId } = context.req.valid('param');
      const actor = await authenticate(context);
      await service().removeResponse(id, responseId, actor.id);
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  return app;
}
export { surveyRoutes };
