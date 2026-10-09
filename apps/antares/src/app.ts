// oxlint-disable import/max-dependencies -- Composition root imports each independently maintained route or contract; domain implementation stays isolated.
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import type { Database } from './db';
import { identityRoutes } from './modules/identity/routes';
import { validateBrowserMutation } from './modules/sessions/security';
import { DomainError } from './modules/errors';
import { siteRoutes } from './modules/content/site';
import { administrationRoutes } from './modules/administration/routes';
import { contentRoutes } from './modules/content/routes';
import { skinRoutes } from './modules/skins/routes';
import type { S3Client } from '@aws-sdk/client-s3';

interface Dependencies {
  readonly checkReady: () => Promise<void>;
  readonly db?: Database['db'];
  readonly siteOrigin?: string;
  readonly secureCookies?: boolean;
  readonly registrationEnabled?: boolean;
  readonly storage?: S3Client;
  readonly bucket?: string;
  readonly sitePhase?: 'PRELAUNCH' | 'OPEN';
  readonly minecraftAddress?: string;
  readonly communityLinks?: readonly { label: string; url: string }[];
}
type JsonContent<Schema extends z.ZodType> = Record<'application/json', { schema: Schema }>;
const HTTP = { ok: 200, invalid: 400, unavailable: 503, internal: 500 } as const;
const MAX_NAME_LENGTH = 80;
const ErrorSchema = z.object({ message: z.string() }).openapi('ApiError');
const HealthSchema = z
  .object({ status: z.literal('ok'), service: z.literal('antares') })
  .openapi('Health');
const GreetingSchema = z.object({ message: z.string() }).openapi('Greeting');
const ReadinessSchema = z.object({ status: z.literal('ready') }).openapi('Readiness');
const QuerySchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH).default('world'),
});

function json<Schema extends z.ZodType>(schema: Schema): JsonContent<Schema> {
  return { 'application/json': { schema } };
}

const healthRoute = createRoute({
  method: 'get',
  path: '/api/health',
  operationId: 'getHealth',
  responses: { 200: { description: 'Process is alive', content: json(HealthSchema) } },
});
const greetingRoute = createRoute({
  method: 'get',
  path: '/api/hello',
  operationId: 'getHello',
  request: { query: QuerySchema },
  responses: {
    200: { description: 'Greeting', content: json(GreetingSchema) },
    400: { description: 'Invalid query', content: json(ErrorSchema) },
  },
});
const readinessRoute = createRoute({
  method: 'get',
  path: '/api/ready',
  operationId: 'getReady',
  responses: {
    200: { description: 'Database and storage are ready', content: json(ReadinessSchema) },
    503: { description: 'Dependency unavailable', content: json(ErrorSchema) },
  },
});

// oxlint-disable-next-line max-lines-per-function -- Application composition keeps security middleware before every mounted route.
function createApp(dependencies: Dependencies): OpenAPIHono {
  const app = new OpenAPIHono({
    defaultHook: (result, context): Response | undefined =>
      result.success ? undefined : context.json({ message: 'Invalid request' }, HTTP.invalid),
  });
  const siteOrigin = dependencies.siteOrigin ?? 'http://localhost:5173';
  app.use('/api/*', cors({ origin: siteOrigin, credentials: true }));
  app.use('/api/v1/*', bodyLimit({ maxSize: 2_200_000 }));
  app.use('/api/*', async (context, next) => {
    context.header('Cache-Control', 'no-store');
    context.header('X-Content-Type-Options', 'nosniff');
    validateBrowserMutation(context.req.raw, siteOrigin);
    // oxlint-disable-next-line node/callback-return -- Hono next is Promise<void>; awaiting it preserves response headers and error propagation.
    await next();
  });
  app.route(
    '/api/v1',
    identityRoutes(dependencies.db, {
      siteOrigin,
      secureCookies: dependencies.secureCookies ?? false,
      registrationEnabled: dependencies.registrationEnabled ?? true,
    }),
  );
  app.route(
    '/api/v1',
    skinRoutes({
      db: dependencies.db,
      storage: dependencies.storage,
      bucket: dependencies.bucket,
      secureCookies: dependencies.secureCookies ?? false,
    }),
  );
  app.route(
    '/api/v1',
    contentRoutes(dependencies.db, dependencies.secureCookies ?? false, siteOrigin),
  );
  app.route(
    '/api/v1',
    siteRoutes({
      links: dependencies.communityLinks,
      phase: dependencies.sitePhase ?? 'PRELAUNCH',
      registrationEnabled: dependencies.registrationEnabled ?? true,
      canonicalOrigin: siteOrigin,
      minecraftAddress: dependencies.minecraftAddress,
    }),
  );
  app.route('/api/v1', administrationRoutes(dependencies.db, dependencies.secureCookies ?? false));
  app.openapi(healthRoute, (context) =>
    context.json({ status: 'ok' as const, service: 'antares' as const }, HTTP.ok),
  );
  app.openapi(greetingRoute, (context) =>
    context.json({ message: `Hello, ${context.req.valid('query').name}!` }, HTTP.ok),
  );
  app.openapi(readinessRoute, async (context) => {
    try {
      await dependencies.checkReady();
      return context.json({ status: 'ready' as const }, HTTP.ok);
    } catch {
      return context.json({ message: 'Dependencies unavailable' }, HTTP.unavailable);
    }
  });
  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: { title: 'HeliCraft Antares', version: '0.1.0' },
  });
  app.get('/', (context) => context.json({ service: 'Antares', openapi: '/openapi.json' }));
  app.onError((error, context) => {
    if (error instanceof DomainError) {
      return context.json({ message: error.message, code: error.code }, error.status);
    }
    console.error('Antares request failed', error.name);
    return context.json({ message: 'Internal server error' }, HTTP.internal);
  });
  return app;
}

export { createApp, type Dependencies };
