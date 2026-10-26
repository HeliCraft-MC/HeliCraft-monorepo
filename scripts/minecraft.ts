import { chmod, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const SECRET_BYTES = 32;
const PRIVATE_FILE_MODE = 0o600;
const ARGUMENT_OFFSET = 3;
const PROJECT = 'helicraft-minecraft-v1-test';
const ENV_FILE = 'infra/minecraft/run/.env';
const action = process.argv[2] ?? 'up';
async function command(args: readonly string[]): Promise<void> {
  const child = Bun.spawn([...args], { stdout: 'inherit', stderr: 'inherit' });
  const status = await child.exited;
  if (status !== 0) {
    throw new Error(`Minecraft task exited ${status}`);
  }
}
async function prepare(): Promise<void> {
  await mkdir('infra/minecraft/run', { recursive: true });
  if (await Bun.file(ENV_FILE).exists()) {
    return;
  }
  const keys = [
    'DATABASE_PASSWORD',
    'STORAGE_SECRET',
    'RIGEL_TOKEN',
    'DENEB_TOKEN',
    'FORWARDING_SECRET',
  ];
  const contents = keys
    .map((key) => `MC_TEST_${key}=${randomBytes(SECRET_BYTES).toString('hex')}`)
    .join('\n');
  await Bun.write(ENV_FILE, `${contents}\n`);
  await chmod(ENV_FILE, PRIVATE_FILE_MODE);
  console.info('Prepared private credentials for the isolated Minecraft test project.');
}
async function compose(args: readonly string[]): Promise<void> {
  await prepare();
  await command([
    'docker',
    'compose',
    '--env-file',
    ENV_FILE,
    '-f',
    'compose.minecraft.yml',
    '-p',
    PROJECT,
    ...args,
  ]);
}
if (action === 'prepare') {
  await prepare();
} else if (action === 'up') {
  await compose(['up', '-d', '--build', '--wait', '--wait-timeout', '300']);
} else if (action === 'down') {
  await compose(['down']);
} else if (action === 'logs') {
  await compose(['logs', '--tail', '150', ...process.argv.slice(ARGUMENT_OFFSET)]);
} else if (action === 'clean') {
  await compose(['down', '--volumes', '--remove-orphans']);
} else if (action === 'config') {
  await compose(['config', '--quiet']);
} else if (action === 'test') {
  await command([
    './gradlew',
    ':minecraft-client:build',
    ':minecraft-client:nativeClientClasspath',
    ':rigel:build',
    ':deneb:build',
  ]);
  await command(['bun', 'run', 'build:ts']);
  await command(['bun', '--no-env-file', 'apps/antares/tests/minecraft-runtime.ts']);
} else {
  throw new Error('Use prepare, up, down, logs, clean, config or test');
}
