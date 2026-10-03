import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';

interface Dependencies {
  readonly checkReady: () => Promise<void>;
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

function createApp(dependencies: Dependencies): OpenAPIHono {
  const app = new OpenAPIHono({
    defaultHook: (result, context): Response | undefined =>
      result.success ? undefined : context.json({ message: 'Invalid request' }, HTTP.invalid),
  });
  app.use('/api/*', cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
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
    console.error(error);
    return context.json({ message: 'Internal server error' }, HTTP.internal);
  });
  return app;
}

export { createApp, type Dependencies };
