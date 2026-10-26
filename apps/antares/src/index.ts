import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { sql } from 'drizzle-orm';
import { createApp } from './app';
import { readConfig } from './config';
import { createDatabase } from './db';
import { expireMinecraft } from './modules/minecraft/lifecycle';
import { openGeoIP } from './modules/minecraft/connection';
import { VotingService } from './modules/voting/service';
import { createStorage } from './storage';

const config = readConfig();
const { pool, db } = createDatabase(config.DATABASE_URL);
const storage = createStorage(config);
const app = createApp({
  db,
  minecraftActors: config.MINECRAFT_SERVICE_ACTORS,
  geoLookup: await openGeoIP(config.GEOIP_DATABASE_PATH),
  squaremapTileSources: config.SQUAREMAP_TILE_SOURCES,
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
const VOTING_TICK_MS = 15_000;
const voting = new VotingService(db);
let votingTickRunning = false;
async function runVotingTick(): Promise<void> {
  if (votingTickRunning) {
    return;
  }
  votingTickRunning = true;
  try {
    await voting.tick();
    await expireMinecraft(db);
  } catch (error) {
    console.error('Voting scheduler failed', error instanceof Error ? error.name : 'Unknown');
  } finally {
    votingTickRunning = false;
  }
}
const votingTimer = setInterval(() => {
  void runVotingTick();
}, VOTING_TICK_MS);
async function shutdown(): Promise<void> {
  clearInterval(votingTimer);
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
