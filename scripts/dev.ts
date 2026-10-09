import type { Subprocess } from 'bun';

const target = process.argv[2] ?? 'all';
if (!['all', 'vega', 'antares'].includes(target)) {
  throw new Error(`Unknown target: ${target}`);
}
const SHUTDOWN_DELAY_MS = 1500;
const children: Subprocess[] = [];
let stopping = false;
function stop(code: number): void {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const child of children) {
    child.kill('SIGTERM');
  }
  setTimeout(() => {
    for (const child of children) {
      child.kill('SIGKILL');
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
const prepare = Bun.spawn(['bun', 'run', 'build:packages'], {
  stdout: 'inherit',
  stderr: 'inherit',
});
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
  const child = Bun.spawn(command, { stdout: 'inherit', stderr: 'inherit' });
  children.push(child);
  void monitor(child);
}
start(['bun', 'run', '--cwd', 'packages/atria', 'dev']);
start(['bun', 'run', '--cwd', 'packages/alhena', 'dev']);
if (target !== 'antares') {
  start(['bun', 'run', '--cwd', 'apps/vega', 'dev']);
}
if (target !== 'vega') {
  start(['bun', 'run', '--cwd', 'apps/antares', 'dev']);
}
