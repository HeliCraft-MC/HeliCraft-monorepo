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
  db,
  sitePhase: config.SITE_PHASE,
  communityLinks: config.COMMUNITY_LINKS,
  minecraftAddress: config.MINECRAFT_ADDRESS,
  storage,
  bucket: config.S3_BUCKET,
  siteOrigin: config.SITE_ORIGIN,
  secureCookies: config.SECURE_COOKIES,
  registrationEnabled: config.REGISTRATION_ENABLED,
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
