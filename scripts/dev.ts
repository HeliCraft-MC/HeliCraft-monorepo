import { availablePort, canListen } from './dev-port';
import type { Subprocess } from 'bun';

const target = process.argv[2] ?? 'all';
if (!['all', 'vega', 'antares'].includes(target)) {
  throw new Error(`Unknown target: ${target}`);
}
const DEFAULT_API_PORT = 3000;
const VEGA_PORT = 5173;
const STORYBOOK_PORT = 6006;
const preferredPort = Number(process.env.PORT ?? DEFAULT_API_PORT);
const apiPort = target === 'vega' ? preferredPort : await availablePort(preferredPort);
const env = {
  ...process.env,
  PORT: String(apiPort),
  API_PROXY_TARGET:
    target === 'vega'
      ? (process.env.API_PROXY_TARGET ?? `http://localhost:${apiPort}`)
      : `http://localhost:${apiPort}`,
};
if (apiPort !== preferredPort) {
  console.info(
    `API port ${preferredPort} is occupied. Antares will use ${apiPort}; Vega will connect to it automatically.`,
  );
}
if (target !== 'antares' && !(await canListen(VEGA_PORT))) {
  throw new Error(
    'Vega port 5173 is occupied. Stop the existing development session before starting another.',
  );
}
if (!(await canListen(STORYBOOK_PORT))) {
  throw new Error(
    'Storybook port 6006 is occupied. Stop the existing Storybook session before starting another.',
  );
}
const SHUTDOWN_DELAY_MS = 1500;
const children: Subprocess[] = [];
let stopping = false;
function signal(child: Subprocess, value: NodeJS.Signals): void {
  if (process.platform === 'win32') {
    child.kill(value);
    return;
  }
  try {
    process.kill(-child.pid, value);
  } catch (error: unknown) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') {
      throw error;
    }
  }
}
function stop(code: number): void {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const child of children) {
    signal(child, 'SIGTERM');
  }
  setTimeout(() => {
    for (const child of children) {
      signal(child, 'SIGKILL');
    }
    process.exit(code);
  }, SHUTDOWN_DELAY_MS);
}
process.once('SIGINT', () => {
  stop(0);
});
process.once('SIGTERM', () => {
  stop(0);
});
if (target !== 'vega') {
  const migration = Bun.spawn(['bun', 'run', '--cwd', 'apps/antares', 'db:migrate'], {
    stdout: 'inherit',
    stderr: 'inherit',
    detached: true,
    env,
  });
  children.push(migration);
  if ((await migration.exited) !== 0) {
    throw new Error('Database migrations failed; development servers were not started.');
  }
}
const prepare = Bun.spawn(['bun', 'run', 'build:packages'], {
  stdout: 'inherit',
  stderr: 'inherit',
  detached: true,
  env,
});
children.push(prepare);
if ((await prepare.exited) !== 0) {
  process.exit(1);
}
async function monitor(child: Subprocess): Promise<void> {
  const code = await child.exited;
  if (!stopping) {
    stop(code === 0 ? 1 : code);
  }
}
function start(command: string[]): void {
  const child = Bun.spawn(command, { stdout: 'inherit', stderr: 'inherit', detached: true, env });
  children.push(child);
  void monitor(child);
}
start(['bun', 'run', '--cwd', 'packages/atria', 'dev']);
start(['bun', 'run', '--cwd', 'packages/atria', 'storybook']);
start(['bun', 'run', '--cwd', 'packages/alhena', 'dev']);
if (target !== 'antares') {
  start(['bun', 'run', '--cwd', 'apps/vega', 'dev']);
}
if (target !== 'vega') {
  start(['bun', 'run', '--cwd', 'apps/antares', 'dev']);
}
