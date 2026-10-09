import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait } from 'testcontainers';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createApp } from '../src/app';
import { createDatabase } from '../src/db';
import { createStorage } from '../src/storage';
import { IdentityService } from '../src/modules/identity/service';
import { userRoles } from '../src/db/schema';
import { SessionService } from '../src/modules/sessions/service';

// Disposable persistence and privileged accounts exist only in the browser test process.
const postgres = await new PostgreSqlContainer('postgis/postgis:18-3.6').start();
const database = createDatabase(postgres.getConnectionUri());
const objectStore = await new GenericContainer('chrislusf/seaweedfs:4.48')
  .withCommand(['mini', '-dir=/data', '-s3.port=8333'])
  .withEnvironment({
    AWS_ACCESS_KEY_ID: 'e2e-access',
    AWS_SECRET_ACCESS_KEY: 'e2e-secret',
    S3_BUCKET: 'helicraft',
  })
  .withExposedPorts(8333)
  .withWaitStrategy(Wait.forLogMessage('All enabled components are running and ready to use:'))
  .start();
const storage = createStorage({
  S3_ENDPOINT: `http://${objectStore.getHost()}:${objectStore.getMappedPort(8333)}`,
  S3_REGION: 'us-east-1',
  S3_ACCESS_KEY: 'e2e-access',
  S3_SECRET_KEY: 'e2e-secret',
});
await migrate(database.db, { migrationsFolder: 'apps/antares/drizzle' });
const identity = new IdentityService(database.db);
await Promise.all(
  [['E2eOwner', 'OWNER'] as const, ['E2eEditor', 'EDITOR'] as const].map(
    async ([username, role]) => {
      const token = await identity.register(username, 'Browser test password 2026');
      const { principal } = await new SessionService(database.db).authenticate(token);
      await database.db.insert(userRoles).values({ userId: principal.id, role });
    },
  ),
);
const servers = [
  { port: 3100, siteOrigin: 'http://localhost:5175' },
  { port: 3101, siteOrigin: 'http://localhost:8085' },
].map(({ port, siteOrigin }) => {
  const app = createApp({
    db: database.db,
    storage,
    bucket: 'helicraft',
    siteOrigin,
    checkReady: async (): Promise<void> => {
      await database.pool.query('select 1');
    },
  });
  return Bun.serve({ port, fetch: app.fetch });
});
async function close(): Promise<void> {
  await Promise.all(
    servers.map(async (server) => {
      await server.stop(true);
    }),
  );
  storage.destroy();
  await database.pool.end();
  await objectStore.stop();
  await postgres.stop();
  process.exit(0);
}
process.once('SIGTERM', (): void => {
  void close();
});
process.once('SIGINT', (): void => {
  void close();
});
