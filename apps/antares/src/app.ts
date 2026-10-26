// oxlint-disable import/max-dependencies -- Composition root imports each independently maintained route or contract; domain implementation stays isolated.
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { except } from 'hono/combine';
import type { Database } from './db';
import { minecraftRoutes } from './modules/minecraft/routes';
import type { GeoLookup } from './modules/minecraft/connection';
import { spatialRoutes } from './modules/spatial/routes';
import { spatialHistoryRoutes } from './modules/spatial/history-routes';
import { spatialMinecraftRoutes } from './modules/spatial/minecraft-routes';
import { tileRoutes } from './modules/spatial/tiles';
import type { TileSource } from './modules/spatial/tile-sources';
import type { ServiceActor } from './modules/minecraft/contracts';
import { identityRoutes } from './modules/identity/routes';
import { validateBrowserMutation } from './modules/sessions/security';
import { DomainError } from './modules/errors';
import { siteSettingsRoutes } from './modules/site-settings/routes';
import { siteRoutes } from './modules/content/site';
import { administrationRoutes } from './modules/administration/routes';
import { contentRoutes } from './modules/content/routes';
import { galleryRoutes } from './modules/gallery/routes';
import { skinRoutes } from './modules/skins/routes';
import { playerRoutes } from './modules/players/routes';
import { stateReformRoutes } from './modules/states/reform-routes';
import { stateMediaRoutes } from './modules/states/media-routes';
import { votingRoutes } from './modules/voting/routes';
import { stateRoutes } from './modules/states/routes';
import { taxationRoutes } from './modules/taxation/routes';
import { monetaryRoutes } from './modules/monetary/routes';
import { companyMediaRoutes } from './modules/companies/media-routes';
import { companyInboxRoutes } from './modules/companies/inbox-routes';
import { companyRoutes } from './modules/companies/routes';
import { companyApplicationRoutes } from './modules/companies/application-routes';
import { companyDecisionRoutes } from './modules/companies/decision-routes';
import { companyLifecycleRoutes } from './modules/companies/lifecycle-routes';
import { shareRoutes } from './modules/companies/share-routes';
import { branchRoutes } from './modules/companies/branch-routes';
import { companyFinanceRoutes } from './modules/companies/finance-routes';
import { companyPaymentQuoteRoutes } from './modules/companies/payment-quote-routes';
import { publicCompanyRoutes } from './modules/companies/public-routes';
import { companyCatalogueRoutes } from './modules/companies/catalogue-routes';
import { fxRoutes } from './modules/fx/routes';
import { publicFxRoutes } from './modules/fx/public-routes';
import type { S3Client } from '@aws-sdk/client-s3';

interface Dependencies {
  readonly squaremapTileSources?: readonly TileSource[];
  readonly minecraftActors?: readonly ServiceActor[];
  readonly geoLookup?: GeoLookup;
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

// oxlint-disable-next-line max-lines-per-function, max-statements -- This composition keeps one atomic workflow or bounded declarative editor together.
function createApp(dependencies: Dependencies): OpenAPIHono {
  const app = new OpenAPIHono({
    defaultHook: (result, context): Response | undefined =>
      result.success ? undefined : context.json({ message: 'Invalid request' }, HTTP.invalid),
  });
  const secureCookies = dependencies.secureCookies ?? false;
  const siteOrigin = dependencies.siteOrigin ?? 'http://localhost:5173';
  app.use('/api/*', cors({ origin: siteOrigin, credentials: true }));
  app.use('/api/v1/account/gallery', bodyLimit({ maxSize: 10_600_000 }));
  app.use('/api/v1/*', except('/api/v1/account/gallery', bodyLimit({ maxSize: 2_200_000 })));
  app.use('/api/*', async (context, next) => {
    context.header('Cache-Control', 'no-store');
    context.header('X-Content-Type-Options', 'nosniff');
    if (!context.req.path.startsWith('/api/v1/internal/minecraft/')) {
      validateBrowserMutation(context.req.raw, siteOrigin);
    }
    // oxlint-disable-next-line node/callback-return -- Hono next is Promise<void>; awaiting it preserves response headers and error propagation.
    await next();
  });
  app.route('/api/v1', spatialRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', spatialHistoryRoutes(dependencies.db));
  app.route('/api/v1', tileRoutes(dependencies.db, dependencies.squaremapTileSources ?? []));
  app.route('/api/v1', spatialMinecraftRoutes(dependencies.db, dependencies.minecraftActors ?? []));
  app.route(
    '/api/v1',
    minecraftRoutes({
      db: dependencies.db,
      actors: dependencies.minecraftActors ?? [],
      geoLookup: dependencies.geoLookup,
      siteOrigin,
      secureCookies,
    }),
  );
  app.route(
    '/api/v1',
    identityRoutes(dependencies.db, {
      siteOrigin,
      secureCookies,
      registrationEnabled: dependencies.registrationEnabled ?? true,
    }),
  );
  app.route(
    '/api/v1',
    skinRoutes({
      db: dependencies.db,
      storage: dependencies.storage,
      bucket: dependencies.bucket,
      secureCookies,
    }),
  );
  app.route(
    '/api/v1',
    galleryRoutes({
      db: dependencies.db,
      storage: dependencies.storage,
      bucket: dependencies.bucket,
      secureCookies,
    }),
  );
  app.route('/api/v1', contentRoutes(dependencies.db, secureCookies, siteOrigin));
  app.route(
    '/api/v1',
    siteRoutes({
      db: dependencies.db,
      links: dependencies.communityLinks,
      phase: dependencies.sitePhase ?? 'PRELAUNCH',
      registrationEnabled: dependencies.registrationEnabled ?? true,
      canonicalOrigin: siteOrigin,
      minecraftAddress: dependencies.minecraftAddress,
    }),
  );
  app.route(
    '/api/v1',
    stateMediaRoutes({
      db: dependencies.db,
      storage: dependencies.storage,
      bucket: dependencies.bucket,
      secureCookies,
    }),
  );
  app.route('/api/v1', stateReformRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', playerRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', votingRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', taxationRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', monetaryRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', publicFxRoutes(dependencies.db));
  app.route('/api/v1', fxRoutes(dependencies.db, secureCookies));
  app.route(
    '/api/v1',
    companyMediaRoutes({
      db: dependencies.db,
      storage: dependencies.storage,
      bucket: dependencies.bucket,
      secureCookies,
    }),
  );
  app.route('/api/v1', companyInboxRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', companyRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', companyApplicationRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', companyDecisionRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', companyLifecycleRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', shareRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', branchRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', companyCatalogueRoutes(dependencies.db));
  app.route('/api/v1', publicCompanyRoutes(dependencies.db));
  app.route('/api/v1', companyFinanceRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', companyPaymentQuoteRoutes(dependencies.db, secureCookies));
  app.route('/api/v1', stateRoutes(dependencies.db, secureCookies));
  app.route(
    '/api/v1',
    siteSettingsRoutes({
      db: dependencies.db,
      storage: dependencies.storage,
      bucket: dependencies.bucket,
      secureCookies,
      minecraftAddress: dependencies.minecraftAddress,
    }),
  );
  app.route('/api/v1', administrationRoutes(dependencies.db, secureCookies));
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
  app.doc31('/openapi.json', {
    openapi: '3.1.0',
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
