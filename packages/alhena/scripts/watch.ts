import { createApp } from '../../../apps/antares/src/app';

// Import the contract so Bun restarts this process whenever its schemas change.
createApp({
  checkReady: async (): Promise<void> => {
    await Promise.resolve();
  },
});
const root = new URL('../../../', import.meta.url).pathname;
async function run(cwd: string, script: string): Promise<void> {
  const child = Bun.spawn(['bun', 'run', script], {
    cwd: root + cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await child.exited) !== 0) {
    process.exit(1);
  }
}
await run('apps/antares', 'openapi');
await run('packages/alhena', 'generate');
await run('packages/alhena', 'build');
// Keep Bun's contract watcher alive between contract changes.
await new Promise<void>(() => {
  // The promise deliberately remains pending for the lifetime of the watcher.
});
