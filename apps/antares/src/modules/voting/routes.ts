import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { VotingInputSchema, VotingDetailSchema } from './contracts';
import { VotingService } from './service';

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
// oxlint-disable-next-line max-lines-per-function -- OpenAPI definitions remain explicit for generated clients.
function votingRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(db, secureCookies);
  async function actorId(context: Context): Promise<string> {
    const principal = await authenticate(context);
    return principal.id;
  }
  function service(): VotingService {
    if (!db) {
      throw new DomainError(
        HTTP.unavailable,
        'VOTING_UNAVAILABLE',
        'Голосования временно недоступны',
      );
    }
    return new VotingService(db);
  }
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/votings',
      operationId: 'createVoting',
      request: { body: { content: { 'application/json': { schema: VotingInputSchema } } } },
      responses: { 200: json(z.object({ id: z.uuid() })), ...Errors },
    }),
    async (context) =>
      context.json(
        { id: await service().create(await actorId(context), context.req.valid('json')) },
        HTTP.ok,
      ),
  );
  for (const action of ['publish', 'cancel'] as const) {
    app.openapi(
      createRoute({
        method: 'post',
        path: `/admin/votings/{id}/${action}`,
        operationId: action === 'publish' ? 'publishVoting' : 'cancelVoting',
        request: { params: Id },
        responses: { 200: json(Success), ...Errors },
      }),
      async (context) => {
        await service()[action](context.req.valid('param').id, await actorId(context));
        return context.json({ success: true as const }, HTTP.ok);
      },
    );
  }
  for (const admin of [true, false]) {
    const prefix = admin ? 'admin' : 'account';
    app.openapi(
      createRoute({
        method: 'get',
        path: `/${prefix}/votings`,
        operationId: admin ? 'listAdminVotings' : 'listVotings',
        responses: { 200: json(z.object({ ids: z.array(z.uuid()) })), ...Errors },
      }),
      async (context) =>
        context.json({ ids: await service().list(await actorId(context), admin) }, HTTP.ok),
    );
    app.openapi(
      createRoute({
        method: 'get',
        path: `/${prefix}/votings/{id}`,
        operationId: admin ? 'getAdminVoting' : 'getVoting',
        request: { params: Id },
        responses: { 200: json(VotingDetailSchema), ...Errors },
      }),
      async (context) =>
        context.json(
          await service().detail(context.req.valid('param').id, await actorId(context), admin),
          HTTP.ok,
        ),
    );
  }
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/votings/{id}/ballot',
      operationId: 'castVotingBallot',
      request: {
        params: Id,
        body: {
          content: {
            'application/json': {
              schema: z.object({ choices: z.array(z.uuid()), abstain: z.boolean() }),
            },
          },
        },
      },
      responses: { 200: json(Success), ...Errors },
    }),
    async (context) => {
      const input = context.req.valid('json');
      await service().cast(context.req.valid('param').id, await actorId(context), {
        choices: input.choices,
        abstain: input.abstain,
      });
      return context.json({ success: true as const }, HTTP.ok);
    },
  );
  return app;
}
export { votingRoutes };
