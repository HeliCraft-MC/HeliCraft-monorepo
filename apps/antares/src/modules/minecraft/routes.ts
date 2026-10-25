import { errors } from '../identity/route-contracts';
// oxlint-disable import/max-dependencies -- Composition imports typed contracts, scoped auth and independent Minecraft services.
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getCookie } from 'hono/cookie';
import type { Database } from '../../db';
import { json } from '../platform/routes';
import { SessionService } from '../sessions/service';
import { RateLimiter } from '../sessions/security';
import { readSiteSettings } from '../site-settings/service';
import { DomainError, HTTP } from '../errors';
import { serviceActor } from './security';
import { MinecraftChallenges } from './challenges';
import { MinecraftSessions } from './sessions';
import {
  AccountMinecraft,
  Admission,
  ChallengeView,
  ConnectionInput,
  DecisionInput,
  IdParams,
  IssuedChallenge,
  ProofInput,
} from './contracts';
import type { ServiceActor } from './contracts';
import { mountServiceSessions } from './session-routes';

const CREATION_LIMIT = 10;
const SERVICE_LIMIT = 2400;
interface MinecraftDependencies {
  readonly db?: Database['db'];
  readonly actors: readonly ServiceActor[];
  readonly siteOrigin: string;
  readonly secureCookies: boolean;
}
// oxlint-disable-next-line max-lines-per-function -- Typed route declarations compose one bounded authentication workflow.
function minecraftRoutes(deps: MinecraftDependencies): OpenAPIHono {
  const app = new OpenAPIHono();
  const limiter = new RateLimiter();
  const challenges = deps.db ? new MinecraftChallenges(deps.db, deps.siteOrigin) : null;
  const sessions = deps.db ? new MinecraftSessions(deps.db) : null;
  const web = deps.db ? new SessionService(deps.db) : null;
  const cookieName = deps.secureCookies ? '__Host-helicraft' : 'helicraft_session';
  function services(): {
    challenges: MinecraftChallenges;
    sessions: MinecraftSessions;
    web: SessionService;
  } {
    if (!challenges || !sessions || !web) {
      throw new DomainError(
        HTTP.unavailable,
        'MINECRAFT_UNAVAILABLE',
        'Minecraft service is unavailable',
      );
    }
    return { challenges, sessions, web };
  }
  app.openapi(
    createRoute({
      method: 'post',
      path: '/internal/minecraft/challenges',
      operationId: 'createMinecraftChallenge',
      request: {
        body: { required: true, content: { 'application/json': { schema: ConnectionInput } } },
      },
      responses: {
        ...errors,
        404: json(z.object({ message: z.string(), code: z.string().optional() })),
        200: json(IssuedChallenge),
      },
    }),
    async (context) => {
      const actor = serviceActor(context, deps.actors, 'RIGEL');
      const input = context.req.valid('json');
      limiter.take(`minecraft:create:${actor.id}`, SERVICE_LIMIT);
      limiter.take(`minecraft:name:${input.username.toLowerCase()}`, CREATION_LIMIT);
      const result = await services().challenges.create(input, actor);
      const site = await readSiteSettings(deps.db, {});
      return context.json({ ...result, serverName: site.serverName }, HTTP.ok);
    },
  );
  for (const operation of ['status', 'consume', 'cancel'] as const) {
    app.openapi(
      createRoute({
        method: 'post',
        path: `/internal/minecraft/challenges/{id}/${operation}`,
        operationId: `${operation}MinecraftChallenge`,
        request: {
          params: IdParams,
          body: { required: true, content: { 'application/json': { schema: ProofInput } } },
        },
        responses: {
          ...errors,
          200: json(z.object({ challenge: ChallengeView, admission: Admission.nullable() })),
        },
      }),
      async (context) => {
        const actor = serviceActor(context, deps.actors, 'RIGEL');
        const input = context.req.valid('json');
        const mapped = { status: 'STATUS', consume: 'CONSUME', cancel: 'CANCEL' } as const;
        return context.json(
          await services().challenges.proof(
            context.req.valid('param').id,
            input,
            actor,
            mapped[operation],
          ),
          HTTP.ok,
        );
      },
    );
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/minecraft',
      operationId: 'getAccountMinecraft',
      responses: {
        ...errors,
        404: json(z.object({ message: z.string(), code: z.string().optional() })),
        200: json(AccountMinecraft),
      },
    }),
    async (context) => {
      const current = await services().web.authenticate(getCookie(context, cookieName));
      return context.json(await services().sessions.account(current.principal.id), HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/minecraft/challenges/{id}/decision',
      operationId: 'decideMinecraftChallenge',
      request: {
        params: IdParams,
        body: { required: true, content: { 'application/json': { schema: DecisionInput } } },
      },
      responses: {
        ...errors,
        404: json(z.object({ message: z.string(), code: z.string().optional() })),
        200: json(ChallengeView),
      },
    }),
    async (context) => {
      const current = await services().web.authenticate(getCookie(context, cookieName));
      limiter.take(`minecraft:decision:${current.principal.id}`, CREATION_LIMIT);
      return context.json(
        await services().challenges.decide(
          context.req.valid('param').id,
          context.req.valid('json'),
          current,
        ),
        HTTP.ok,
      );
    },
  );
  mountServiceSessions(app, deps.actors, () => services().sessions);
  return app;
}
export { minecraftRoutes, type MinecraftDependencies };
