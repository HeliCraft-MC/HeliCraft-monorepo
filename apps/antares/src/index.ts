import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { sql } from 'drizzle-orm';
import { createApp } from './app';
import { readConfig } from './config';
import { createDatabase } from './db';
import { createStorage } from './storage';

const config = readConfig();
const { pool, db } = createDatabase(config.DATABASE_URL);
const storage = createStorage(config);
const app = createApp({
  checkReady: async () => {
    await db.execute(sql`select PostGIS_Version()`);
    await storage.send(new HeadBucketCommand({ Bucket: config.S3_BUCKET }));
  },
});
const server = Bun.serve({ port: config.PORT, fetch: app.fetch });
console.info(`Antares listening on ${server.url}`);
async function shutdown(): Promise<void> {
  await server.stop();
  await pool.end();
  storage.destroy();
}
process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});
