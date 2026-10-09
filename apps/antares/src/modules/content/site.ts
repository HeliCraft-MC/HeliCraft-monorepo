import { HTTP } from '../errors';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

const SiteSchema = z
  .object({
    phase: z.enum(['PRELAUNCH', 'OPEN']),
    registrationEnabled: z.boolean(),
    minecraftAddress: z.string().nullable(),
    canonicalOrigin: z.url(),
    links: z.array(z.object({ label: z.string(), url: z.url() })),
  })
  .openapi('PublicSite');
interface SiteConfig {
  readonly links?: readonly { label: string; url: string }[];
  readonly phase: 'PRELAUNCH' | 'OPEN';
  readonly registrationEnabled: boolean;
  readonly minecraftAddress?: string;
  readonly canonicalOrigin: string;
}
function siteRoutes(config: SiteConfig): OpenAPIHono {
  const app = new OpenAPIHono();
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/site',
      operationId: 'getSite',
      responses: {
        200: {
          description: 'Public launch configuration',
          content: { 'application/json': { schema: SiteSchema } },
        },
      },
    }),
    (context) =>
      context.json(
        {
          phase: config.phase,
          registrationEnabled: config.registrationEnabled,
          minecraftAddress: config.phase === 'OPEN' ? (config.minecraftAddress ?? null) : null,
          canonicalOrigin: config.canonicalOrigin,
          links: [...(config.links ?? [])],
        },
        HTTP.ok,
      ),
  );
  const WorldSchema = z
    .object({
      phase: z.enum(['PRELAUNCH', 'OPEN']),
      title: z.string(),
      description: z.string(),
      roadmap: z.array(z.string()),
    })
    .openapi('WorldSummary');
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/world/summary',
      operationId: 'getWorldSummary',
      responses: {
        200: {
          description: 'World concept and honest launch state',
          content: { 'application/json': { schema: WorldSchema } },
        },
      },
    }),
    (context) =>
      context.json(
        {
          phase: config.phase,
          title: 'Один мир. Много историй.',
          description:
            'Постоянный Minecraft-мир для исследователей, создателей и сообществ. Политические и экономические системы находятся в разработке; независимая игра остаётся полноценным выбором.',
          roadmap: [
            'Государства и общественные решения',
            'Связанная с миром экономика',
            'История действий игроков',
          ],
        },
        HTTP.ok,
      ),
  );
  return app;
}

export { siteRoutes, type SiteConfig };
