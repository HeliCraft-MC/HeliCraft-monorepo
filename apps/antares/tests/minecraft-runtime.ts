// oxlint-disable no-magic-numbers, import/max-dependencies, max-lines, no-await-in-loop, unicorn/no-await-expression-member -- This disposable acceptance harness composes real servers and runs dependent lifecycle assertions sequentially; fixed ports/timeouts are test configuration.
import { createHash, randomBytes } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { chromium, expect } from '@playwright/test';
import { z } from 'zod';
import { verifyMinecraftFaults } from './minecraft-fault-scenarios';
import { createApp } from '../src/app';
import { createDatabase } from '../src/db';
import { AccountMinecraft } from '../src/modules/minecraft/contracts';
import { connectMinecraft } from '../../../tests/minecraft/client';
import type { ProtocolConnection } from '../../../tests/minecraft/client';
import { verifyTerritoryRuntime } from '../../../tests/minecraft/territories';
import type { Subprocess } from 'bun';

const root = path.resolve(import.meta.dir, '../../..');
const run = await mkdtemp('/tmp/helicraft-minecraft-v1-');
const origin = 'http://localhost:8096';
const serverLock = z.object({ url: z.url(), sha256: z.string() });
const rigelToken = randomBytes(32).toString('hex');
const denebToken = randomBytes(32).toString('hex');
const forwarding = randomBytes(32).toString('hex');
const clients: ProtocolConnection[] = [];
const children: {
  readonly process: Subprocess;
  readonly service: string;
  readonly write: (command: string) => Promise<void>;
}[] = [];
let spatialUnavailable = false;
async function artifact(url: string, sha256: string, filename: string): Promise<string> {
  const target = path.join(root, 'build/minecraft', filename);
  await mkdir(path.dirname(target), { recursive: true });
  let bytes = await Bun.file(target)
    .bytes()
    .catch(() => new Uint8Array());
  if (createHash('sha256').update(bytes).digest('hex') !== sha256) {
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) {
      throw new Error(`Artifact HTTP ${response.status}`);
    }
    bytes = new Uint8Array(await response.arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== sha256) {
      throw new Error('Artifact checksum mismatch');
    }
    await Bun.write(target, bytes);
  }
  return target;
}
async function waitUntil(predicate: () => Promise<boolean>, description: string): Promise<void> {
  const deadline = Date.now() + 180_000;
  while (!(await predicate())) {
    const stopped = children.find((child) => child.process.exitCode !== null);
    if (stopped !== undefined) {
      throw new Error(`${stopped.service} stopped before ${description}. Logs: ${run}`);
    }
    if (Date.now() > deadline) {
      throw new Error(`Runtime timeout: ${description}. Logs: ${run}`);
    }
    await Bun.sleep(500);
  }
}
async function start(
  service: string,
  args: string[],
  config: { readonly cwd: string; readonly env: NodeJS.ProcessEnv },
): Promise<void> {
  const descriptor = await open(path.join(run, `${service}.log`), 'w');
  const child = Bun.spawn(args, {
    cwd: config.cwd,
    env: { ...process.env, ...config.env },
    stdin: 'pipe',
    stdout: descriptor.fd,
    stderr: descriptor.fd,
  });
  await descriptor.close();
  children.push({
    process: child,
    service,
    write: async (command): Promise<void> => {
      if (command.includes('\n')) {
        throw new Error('One disposable server console command required');
      }
      void child.stdin.write(`${command}\n`);
      await child.stdin.flush();
    },
  });
}
async function paperConsole(command: string): Promise<void> {
  const paper = children.find((child) => child.service === 'paper');
  if (!paper || paper.process.exitCode !== null) {
    throw new Error('Disposable Paper is not running');
  }
  await paper.write(command);
}
async function stopService(prefix: string, signal: 'SIGTERM' | 'SIGKILL'): Promise<void> {
  const index = children.findIndex((child) => child.service.startsWith(prefix));
  const child = children[index];
  if (child === undefined) {
    return;
  }
  child.process.kill(signal);
  await child.process.exited;
  children.splice(index, 1);
}
async function gameAccount(cookie: string): Promise<ReturnType<typeof AccountMinecraft.parse>> {
  const response = await fetch(`${origin}/api/v1/account/minecraft`, {
    headers: { Cookie: cookie },
  });
  return AccountMinecraft.parse(await response.json());
}
console.info(`Minecraft runtime evidence: ${run}`);
const postgres = await new PostgreSqlContainer('postgis/postgis:18-3.6')
  .withDatabase('helicraft_minecraft_test')
  .start();
const database = createDatabase(postgres.getConnectionUri());
let server: ReturnType<typeof Bun.serve> | null = null;
let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
try {
  await migrate(database.db, { migrationsFolder: path.join(root, 'apps/antares/drizzle') });
  const app = createApp({
    db: database.db,
    siteOrigin: origin,
    squaremapTileSources: [{ backendId: 'deneb', origin: 'http://127.0.0.1:8081' }],
    minecraftActors: [
      { id: 'rigel-test', role: 'RIGEL', backendId: 'deneb', token: rigelToken },
      { id: 'deneb-test', role: 'DENEB', backendId: 'deneb', token: denebToken },
    ],
    checkReady: async () => {
      await Promise.resolve();
    },
  });
  server = Bun.serve({
    port: 3106,
    hostname: '127.0.0.1',
    fetch: async (request) => {
      if (
        spatialUnavailable &&
        new URL(request.url).pathname.startsWith('/api/v1/internal/minecraft/spatial/')
      ) {
        return new Response('Spatial service test outage', { status: 503 });
      }
      return await app.fetch(request);
    },
  });
  await start('vega', ['bun', '--no-env-file', 'infra/serve-vega.ts'], {
    cwd: root,
    env: {
      PORT: '8096',
      VEGA_BUILD_ROOT: 'apps/vega/dist',
      API_PROXY_TARGET: 'http://localhost:3106',
      SITE_ORIGIN: origin,
      WEB_HOST: '127.0.0.1',
    },
  });
  const velocity = serverLock.parse(
    await Bun.file(path.join(root, 'apps/rigel/server-lock.json')).json(),
  );
  const paper = serverLock.parse(
    await Bun.file(path.join(root, 'apps/deneb/server-lock.json')).json(),
  );
  const [velocityJar, paperJar] = await Promise.all([
    artifact(velocity.url, velocity.sha256, 'velocity.jar'),
    artifact(paper.url, paper.sha256, 'paper.jar'),
  ]);
  const proxyDir = path.join(run, 'velocity');
  const paperDir = path.join(run, 'paper');
  await mkdir(path.join(proxyDir, 'plugins/limboapi'), { recursive: true });
  await mkdir(path.join(paperDir, 'plugins'), { recursive: true });
  await mkdir(path.join(paperDir, 'config'), { recursive: true });
  await Promise.all([
    copyFile(
      path.join(root, 'apps/rigel/build/libs/rigel.jar'),
      path.join(proxyDir, 'plugins/rigel.jar'),
    ),
    copyFile(
      path.join(root, 'build/minecraft/limboapi.jar'),
      path.join(proxyDir, 'plugins/limboapi.jar'),
    ),
    copyFile(
      path.join(root, 'infra/minecraft/limbo-config.yml'),
      path.join(proxyDir, 'plugins/limboapi/config.yml'),
    ),
    copyFile(
      path.join(root, 'apps/deneb/build/libs/deneb.jar'),
      path.join(paperDir, 'plugins/deneb.jar'),
    ),
  ]);
  const squaremap = serverLock.parse(
    await Bun.file(path.join(root, 'infra/minecraft/squaremap-lock.json')).json(),
  );
  await copyFile(
    await artifact(squaremap.url, squaremap.sha256, 'squaremap.jar'),
    path.join(paperDir, 'plugins/squaremap.jar'),
  );
  await mkdir(path.join(paperDir, 'plugins/squaremap'), { recursive: true });
  await Bun.write(
    path.join(paperDir, 'plugins/squaremap/config.yml'),
    (await Bun.file(path.join(root, 'infra/minecraft/squaremap-config.yml')).text()).replace(
      'bind: 0.0.0.0',
      'bind: 127.0.0.1',
    ),
  );
  const proxyConfig = (await readFile(path.join(root, 'apps/rigel/docker/velocity.toml'), 'utf8'))
    .replace('0.0.0.0:25565', '127.0.0.1:25575')
    .replace('deneb:25566', '127.0.0.1:25576')
    .replace('try = ["deneb"]', 'try = ["deneb"]\nescape = "127.0.0.1:25576"')
    .replace('[forced-hosts]', '[forced-hosts]\n"escape.test" = ["escape"]');
  await Bun.write(path.join(proxyDir, 'velocity.toml'), proxyConfig);
  await Bun.write(path.join(proxyDir, 'forwarding.secret'), forwarding);
  await Bun.write(path.join(paperDir, 'eula.txt'), 'eula=true\n');
  const properties = (
    await readFile(path.join(root, 'apps/deneb/docker/server.properties'), 'utf8')
  ).replace('25566', '25576');
  await Bun.write(
    path.join(paperDir, 'server.properties'),
    `${properties}\nserver-ip=127.0.0.1\nlevel-name=disposable-world\nview-distance=2\nsimulation-distance=2\ndifficulty=peaceful\n`,
  );
  const paperConfig = (
    await readFile(path.join(root, 'apps/deneb/docker/paper-global.yml'), 'utf8')
  ).replace('__FORWARDING_SECRET__', forwarding);
  await Bun.write(path.join(paperDir, 'config/paper-global.yml'), paperConfig);
  await start(
    'paper',
    [
      'java',
      '-Xms256M',
      '-Xmx1G',
      '-Dterminal.jline=false',
      '-Dterminal.ansi=false',
      '-jar',
      paperJar,
      '--nogui',
    ],
    {
      cwd: paperDir,
      env: { ANTARES_URL: 'http://localhost:3106', DENEB_SERVICE_TOKEN: denebToken },
    },
  );
  await waitUntil(
    async () => (await Bun.file(path.join(run, 'paper.log')).text()).includes('Done ('),
    'Paper startup',
  );
  await start(
    'velocity',
    [
      'java',
      '-Xms128M',
      '-Xmx768M',
      '-Dterminal.jline=false',
      '-Dterminal.ansi=false',
      '-jar',
      velocityJar,
    ],
    {
      cwd: proxyDir,
      env: {
        ANTARES_URL: 'http://localhost:3106',
        RIGEL_SERVICE_TOKEN: rigelToken,
        SITE_ORIGIN: origin,
      },
    },
  );
  await waitUntil(
    async () => (await Bun.file(path.join(run, 'velocity.log')).text()).includes('Rigel ready:'),
    'Rigel startup',
  );
  console.info('Real Paper/Velocity/LimboAPI startup passed.');
  await waitUntil(async () => (await fetch(origin)).ok, 'Vega production startup');
  const unknown = connectMinecraft('UnknownUser', 25_575);
  clients.push(unknown);
  await unknown.waitFor(() => unknown.disconnected, 'unknown account rejection');
  expect(unknown.messages.join(' ')).toContain('/register');
  const direct = connectMinecraft('DirectBypass', 25_576);
  clients.push(direct);
  await direct.waitFor(() => direct.disconnected, 'direct Paper rejection');
  console.info('Unknown account and direct Paper connection rejected.');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  const name = `mc${randomBytes(5).toString('hex')}`;
  const password = randomBytes(24).toString('hex');
  const registration = await context.request.post(`${origin}/api/v1/auth/register`, {
    headers: { Origin: origin },
    data: { username: name, password },
  });
  expect(registration.ok()).toBe(true);
  const registered = z.object({ id: z.uuid() }).parse(await registration.json());
  const cookies = await context.cookies(origin);
  const cookie = cookies.map((item) => `${item.name}=${item.value}`).join('; ');
  await page.goto(`${origin}/app/minecraft?lang=en`);
  await expect(page.getByRole('heading', { name: 'Game identity', exact: true })).toBeVisible();
  // Respect the proxy login cooldown between sequential connections from this test host.
  await Bun.sleep(3100);
  const player = connectMinecraft(name, 25_575);
  clients.push(player);
  await player.waitFor(
    () => /Code \/ Код: (?<code>[\dA-F]{16})/u.test(player.messages.join(' ')),
    'auth lobby code',
  );
  expect(player.loginIds).toContain(registered.id);
  const match = /Code \/ Код: (?<code>[\dA-F]{16})/u.exec(player.messages.join(' '));
  const code = match?.groups?.code;
  if (code === undefined) {
    throw new Error('No code from real Minecraft lobby');
  }
  expect((await gameAccount(cookie)).session).toBeNull();
  player.client.chat('/server deneb');
  await Bun.sleep(500);
  expect((await gameAccount(cookie)).session).toBeNull();
  expect(
    await Bun.file(
      path.join(paperDir, 'disposable-world/players/data', `${registered.id}.dat`),
    ).exists(),
  ).toBe(false);
  const wrongCode = `${code.startsWith('0') ? '1' : '0'}${code.slice(1)}`;
  await page.getByLabel('Code from Minecraft', { exact: true }).fill(wrongCode);
  await page.getByRole('button', { name: 'Confirm Minecraft sign-in', exact: true }).click();
  await expect(
    page.getByText('The code does not match your Minecraft client. Check all 16 characters.', {
      exact: true,
    }),
  ).toBeVisible();
  expect((await gameAccount(cookie)).session).toBeNull();
  await page.getByLabel('Code from Minecraft', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Confirm Minecraft sign-in', exact: true }).click();
  await player.waitFor(
    () => player.messages.join(' ').includes('Welcome to'),
    'Paper welcome after browser approval',
  );
  await waitUntil(
    async () => (await gameAccount(cookie)).session?.online === true,
    'Vega online presence',
  );
  await expect(page.getByText('Online in Minecraft', { exact: true })).toBeVisible();
  const { session } = await gameAccount(cookie);
  expect(session?.accountId).toBe(registered.id);
  const beforeCommand = player.messages.length;
  player.client.chat('/heli profile');
  await player.waitFor(
    () => player.messages.slice(beforeCommand).join(' ').includes(registered.id),
    'verified /heli profile',
  );
  const paperLog = await Bun.file(path.join(run, 'paper.log')).text();
  expect(paperLog).toContain(`Deneb joined account ${registered.id}`);
  await page.evaluate(() => {
    globalThis.scrollTo(0, 0);
  });
  await page.screenshot({ path: path.join(run, 'minecraft-online.png'), fullPage: true });
  const spatialEvidence = await verifyTerritoryRuntime({
    browser,
    db: database.db,
    run,
    origin,
    username: name,
    player,
    paperPid: () => children.find((child) => child.service === 'paper')?.process.pid,
    console: paperConsole,
    waitUntil,
    spatialUnavailable: (unavailable) => {
      spatialUnavailable = unavailable;
    },
  });
  player.client.end();
  await waitUntil(
    async () => (await gameAccount(cookie)).session === null,
    'disconnect closes session',
  );
  expect((await gameAccount(cookie)).events).toHaveLength(2);
  await expect(page.getByText('Offline in Minecraft', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Left Minecraft/u)).toBeVisible();
  await waitUntil(
    async () =>
      await Bun.file(
        path.join(paperDir, 'disposable-world/players/data', `${registered.id}.dat`),
      ).exists(),
    'playerdata uses the Antares UUID',
  );
  await Bun.sleep(3100);
  const rejected = connectMinecraft(name, 25_575);
  clients.push(rejected);
  await rejected.waitFor(
    () => /Code \/ Код: (?<code>[\dA-F]{16})/u.test(rejected.messages.join(' ')),
    'fresh reconnect challenge',
  );
  expect(rejected.loginIds).toContain(registered.id);
  await page.getByRole('button', { name: 'Reject sign-in', exact: true }).click();
  await rejected.waitFor(() => rejected.disconnected, 'browser rejection disconnects before Paper');
  expect((await gameAccount(cookie)).events).toHaveLength(2);
  await server.stop(true);
  server = null;
  await Bun.sleep(3100);
  const unavailable = connectMinecraft(name, 25_575);
  clients.push(unavailable);
  await unavailable.waitFor(() => unavailable.disconnected, 'API outage fails closed');
  expect(unavailable.loginIds).toStrictEqual([]);
  server = Bun.serve({ port: 3106, hostname: '127.0.0.1', fetch: app.fetch });
  expect((await gameAccount(cookie)).events).toHaveLength(2);
  console.info(
    'Pre-auth /server bypass, fresh reconnect UUID, browser rejection and API outage passed.',
  );
  expect(pageErrors).toStrictEqual([]);
  const finalPaperLog = await Bun.file(path.join(run, 'paper.log')).text();
  const finalProxyLog = await Bun.file(path.join(run, 'velocity.log')).text();
  expect(finalPaperLog).toContain('Paper version 26.3-223');
  expect(finalProxyLog).toContain('limboapi 1.1.27-SNAPSHOT (git-bfef579)');
  expect(finalPaperLog).not.toMatch(/\bERROR\b|Exception/u);
  expect(finalProxyLog).not.toMatch(/\bERROR\b|Exception/u);
  const pendingPlayer = async (virtualHost?: string): Promise<ProtocolConnection> => {
    await Bun.sleep(3100);
    const next = connectMinecraft(name, 25_575, virtualHost);
    clients.push(next);
    await next.waitFor(
      () => /Code \/ Код: (?<code>[\dA-F]{16})/u.test(next.messages.join(' ')),
      'connection-specific challenge',
    );
    expect(next.loginIds).toContain(registered.id);
    expect((await gameAccount(cookie)).session).toBeNull();
    return next;
  };
  const approve = async (next: ProtocolConnection): Promise<void> => {
    const proof = /Code \/ Код: (?<code>[\dA-F]{16})/u.exec(next.messages.join(' '))?.groups?.code;
    const [challenge] = (await gameAccount(cookie)).challenges;
    if (proof === undefined || challenge === undefined) {
      throw new Error('No owned game challenge');
    }
    const response = await context.request.post(
      `${origin}/api/v1/account/minecraft/challenges/${challenge.id}/decision`,
      { headers: { Origin: origin }, data: { code: proof, decision: 'APPROVE' } },
    );
    expect(response.ok()).toBe(true);
  };
  const noSession = async (): Promise<void> => {
    await waitUntil(async () => {
      const account = await gameAccount(cookie);
      return account.session === null && account.challenges.length === 0;
    }, 'all plugin leases and pending challenges close');
  };
  await verifyMinecraftFaults({
    pendingPlayer,
    approve,
    noSession,
    eventCount: async (): Promise<number> => (await gameAccount(cookie)).events.length,
    admittedPlayer: async (): Promise<ProtocolConnection> => {
      const next = await pendingPlayer();
      await approve(next);
      await next.waitFor(
        () => next.messages.join(' ').includes('Welcome to'),
        'recovered Paper welcome',
      );
      await waitUntil(
        async () => (await gameAccount(cookie)).session?.online === true,
        'actual recovered Paper presence',
      );
      return next;
    },
    rejectedPlayer: async (): Promise<ProtocolConnection> => {
      await Bun.sleep(3100);
      const next = connectMinecraft(name, 25_575);
      clients.push(next);
      return next;
    },
    stopProxy: async (signal): Promise<void> => {
      await stopService('velocity', signal);
    },
    stopPaper: async (signal): Promise<void> => {
      await stopService('paper', signal);
    },
    restartProxy: async (label, fault): Promise<void> => {
      await stopService('velocity', 'SIGTERM');
      await Bun.write(
        path.join(proxyDir, 'forwarding.secret'),
        fault === 'FORWARDING' ? randomBytes(32).toString('hex') : forwarding,
      );
      await start(
        label,
        [
          'java',
          '-Xms128M',
          '-Xmx768M',
          '-Dterminal.jline=false',
          '-Dterminal.ansi=false',
          '-jar',
          velocityJar,
        ],
        {
          cwd: proxyDir,
          env: {
            ANTARES_URL: 'http://localhost:3106',
            RIGEL_SERVICE_TOKEN: fault === 'TOKEN' ? randomBytes(32).toString('hex') : rigelToken,
            SITE_ORIGIN: origin,
          },
        },
      );
      await waitUntil(
        async () => (await Bun.file(path.join(run, `${label}.log`)).text()).includes('Done ('),
        `${label} startup`,
      );
    },
    restartPaper: async (label): Promise<void> => {
      await start(
        label,
        [
          'java',
          '-Xms256M',
          '-Xmx1G',
          '-Dterminal.jline=false',
          '-Dterminal.ansi=false',
          '-jar',
          paperJar,
          '--nogui',
        ],
        {
          cwd: paperDir,
          env: { ANTARES_URL: 'http://localhost:3106', DENEB_SERVICE_TOKEN: denebToken },
        },
      );
      await waitUntil(
        async () => (await Bun.file(path.join(run, `${label}.log`)).text()).includes('Done ('),
        `${label} startup`,
      );
    },
  });
  await page.goto(`${origin}/app/minecraft?lang=ru`);
  const russianPlayer = await pendingPlayer();
  const russianCode = /Code \/ Код: (?<code>[\dA-F]{16})/u.exec(russianPlayer.messages.join(' '))
    ?.groups?.code;
  if (russianCode === undefined) {
    throw new Error('No native locale acceptance proof');
  }
  await page.getByLabel('Код из Minecraft', { exact: true }).fill(russianCode);
  await page.getByRole('button', { name: 'Подтвердить вход в Minecraft', exact: true }).click();
  await russianPlayer.waitFor(
    () => russianPlayer.messages.join(' ').includes('Добро пожаловать'),
    'website-selected Russian welcome',
  );
  expect(russianPlayer.loginIds).toContain(registered.id);
  await russianPlayer.waitFor(
    () => russianPlayer.titles.join(' ').includes('Аврора'),
    'localized jurisdiction at persisted login position',
  );
  russianPlayer.client.chat('/heli whereami');
  await russianPlayer.waitFor(
    () => russianPlayer.messages.join(' ').includes('Аврора'),
    'localized physical jurisdiction',
  );
  russianPlayer.client.end();
  await noSession();
  expect(pageErrors).toStrictEqual([]);
  console.info(
    'Website-selected Russian locale overrides the game default; persisted-location login jurisdiction passed.',
  );
  expect(
    (await readdir(path.join(paperDir, 'disposable-world/players/data'))).filter((file) =>
      file.endsWith('.dat'),
    ),
  ).toStrictEqual([`${registered.id}.dat`]);
  console.info(
    'Crash lease expiry, real restarts, wrong forwarding, unavailable Paper, stale token, forced host and recovery passed.',
  );
  console.info(
    'Real protocol lobby → Vega approval → stable UUID forwarding → Paper welcome/profile → private online presence → disconnect passed.',
  );
  await Bun.write(
    path.join(run, 'result.json'),
    JSON.stringify(
      {
        status: 'passed',
        protocolClient: 'MCProtocolLib 26.3 / Minecraft 26.3 / protocol 777',
        paper: '26.3-223',
        velocity: '4.2.0-30',
        limbo: '1.1.27-SNAPSHOT bfef579',
        adapter: null,
        spatial: spatialEvidence,
        localeAcceptance: 'Vega ru → native welcome/title/whereami; persisted-location login',
        accountId: registered.id,
        pageErrors,
        faultScenarios: [
          'crash lease expiry',
          'Velocity/Paper restart',
          'wrong forwarding secret',
          'Paper unavailable',
          'stale service token',
          'forced-host/other backend',
          'recovery',
        ],
      },
      null,
      2,
    ),
  );
} finally {
  for (const client of clients) {
    client.client.end();
  }
  if (browser !== null) {
    for (const context of browser.contexts()) {
      for (const page of context.pages()) {
        await page
          .screenshot({ path: path.join(run, 'minecraft-last.png'), fullPage: true })
          .catch(() => null);
      }
    }
  }
  await browser?.close();
  // oxlint-disable-next-line unicorn/no-array-reverse -- Reverse this private process stack for dependency-ordered shutdown on the ES2021 target.
  for (const child of children.reverse()) {
    child.process.kill('SIGTERM');
    await child.process.exited;
  }
  await server?.stop(true);
  await database.pool.end();
  await postgres.stop();
  console.info(`Runtime stopped; disposable evidence retained at ${run}`);
}
