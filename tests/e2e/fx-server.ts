// Disposable PostgreSQL, identities and test controls exist only in this browser fixture process.
import { createFxFixture, fxCommand } from '../../apps/antares/tests/fx-fixture';
import { createApp } from '../../apps/antares/src/app';
import { freeCompanyPolicy } from '../../apps/antares/tests/companies-fixture';

const results = await Promise.allSettled([
  createFxFixture({ migrationsFolder: 'apps/antares/drizzle' }),
  createFxFixture({ migrationsFolder: 'apps/antares/drizzle' }),
]);
const [development, production] = results;
if (development?.status !== 'fulfilled' || production?.status !== 'fulfilled') {
  await Promise.all(
    results.map(async (result) => {
      if (result.status === 'fulfilled') {
        await result.value.db.pool.end();
        await result.value.container.stop();
      }
    }),
  );
  throw new Error('Disposable FX browser fixtures could not start');
}
const configurations = [
  { fixture: development.value, port: 3117, siteOrigin: 'http://localhost:5187' },
  { fixture: production.value, port: 3118, siteOrigin: 'http://localhost:8089' },
];
await Promise.all(
  configurations.map(async ({ fixture }) => {
    await fxCommand(fixture, fixture.first, {
      kind: 'SET_COMPANY_REGISTRATION_POLICY',
      baseRevisionId: null,
      policy: freeCompanyPolicy,
    });
  }),
);
const servers = configurations.map(({ fixture, port, siteOrigin }) => {
  const app = createApp({
    db: fixture.db.db,
    siteOrigin,
    checkReady: async (): Promise<void> => {
      await fixture.db.pool.query('select 1');
    },
  });
  const observations: { path: string; cookiePresent: boolean }[] = [];
  return Bun.serve({
    port,
    async fetch(request): Promise<Response> {
      const path = new URL(request.url).pathname;
      if (path === '/api/__e2e/fx-fixture') {
        return Response.json({
          firstStateId: fixture.first.stateId,
          secondStateId: fixture.second.stateId,
          firstCurrency: fixture.firstCurrency,
          secondCurrency: fixture.secondCurrency,
        });
      }
      if (path === '/api/__e2e/fx-observed') {
        return Response.json({ observations });
      }
      if (path.startsWith('/api/v1/public/fx/')) {
        observations.push({ path, cookiePresent: request.headers.has('cookie') });
      }
      return await app.fetch(request);
    },
  });
});
async function close(): Promise<void> {
  await Promise.all(
    servers.map(async (server) => {
      await server.stop(true);
    }),
  );
  await Promise.all(
    configurations.map(async ({ fixture }) => {
      await fixture.db.pool.end();
      await fixture.container.stop();
    }),
  );
}
process.once('SIGTERM', (): void => {
  void close();
});
process.once('SIGINT', (): void => {
  void close();
});
