import { errors } from '../identity/route-contracts';
import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { json } from '../platform/routes';
import { HTTP } from '../errors';
import { LocaleSchema } from '../localized-content/contracts';
import { Admission, PaperIdentity, Profile, SessionInput } from './contracts';
import type { ServiceActor } from './contracts';
import type { MinecraftSessions } from './sessions';
import { serviceActor } from './security';

// oxlint-disable-next-line max-lines-per-function -- Service roles and all typed session operations are kept at one route boundary.
function mountServiceSessions(
  app: OpenAPIHono,
  actors: readonly ServiceActor[],
  service: () => MinecraftSessions,
): void {
  app.openapi(
    createRoute({
      method: 'post',
      path: '/internal/minecraft/paper/admission',
      operationId: 'getMinecraftAdmission',
      request: {
        body: { required: true, content: { 'application/json': { schema: PaperIdentity } } },
      },
      responses: {
        ...errors,
        404: json(z.object({ message: z.string(), code: z.string().optional() })),
        200: json(Admission),
      },
    }),
    async (context) => {
      const actor = serviceActor(context, actors, 'DENEB');
      const input = context.req.valid('json');
      return context.json(
        await service().admission(input.accountId, input.username, actor),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/internal/minecraft/paper/profile',
      operationId: 'getMinecraftProfile',
      request: {
        body: {
          required: true,
          content: {
            'application/json': { schema: PaperIdentity.extend({ locale: LocaleSchema }) },
          },
        },
      },
      responses: {
        ...errors,
        404: json(z.object({ message: z.string(), code: z.string().optional() })),
        200: json(Profile),
      },
    }),
    async (context) => {
      const actor = serviceActor(context, actors, 'DENEB');
      const input = context.req.valid('json');
      return context.json(
        await service().profile(input.accountId, input.username, actor, input.locale),
        HTTP.ok,
      );
    },
  );
  for (const role of ['RIGEL', 'DENEB'] as const) {
    for (const operation of [
      'heartbeat',
      'close',
      ...(role === 'DENEB' ? (['join'] as const) : []),
    ] as const) {
      app.openapi(
        createRoute({
          method: 'post',
          path: `/internal/minecraft/${role.toLowerCase()}/${operation}`,
          operationId: `${operation}${role}MinecraftSession`,
          request: {
            body: { required: true, content: { 'application/json': { schema: SessionInput } } },
          },
          responses: {
            ...errors,
            404: json(z.object({ message: z.string(), code: z.string().optional() })),
            200: json(z.object({ admission: Admission.nullable() })),
          },
        }),
        async (context) => {
          const actor = serviceActor(context, actors, role);
          const { sessionId } = context.req.valid('json');
          if (operation === 'close') {
            await service().close(sessionId, actor);
            return context.json({ admission: null }, HTTP.ok);
          }
          return context.json(
            {
              admission: await service().touch(
                sessionId,
                actor,
                operation === 'join' ? 'JOIN' : 'HEARTBEAT',
              ),
            },
            HTTP.ok,
          );
        },
      );
    }
  }
}
export { mountServiceSessions };
