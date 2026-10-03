import type { Subprocess } from 'bun';

const action = process.argv[2] ?? 'build';
const target = process.argv[3] ?? 'all';
if (
  !['build', 'test', 'dev', 'lint', 'format', 'format-check'].includes(action) ||
  !['all', 'deneb', 'rigel'].includes(target)
) {
  throw new Error('Invalid Java task');
}
const names = target === 'all' ? ['deneb', 'rigel'] : [target];
const taskNames: Record<string, string[]> = {
  build: ['build'],
  test: ['test'],
  dev: ['build'],
  lint: ['checkstyleMain', 'checkstyleTest'],
  format: ['spotlessApply'],
  'format-check': ['spotlessCheck'],
};
const tasks = names.flatMap((name) => (taskNames[action] ?? []).map((task) => `:${name}:${task}`));
const command = [process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ...tasks];
if (action === 'dev') {
  command.push('--continuous');
}
const child: Subprocess = Bun.spawn(command, { stdout: 'inherit', stderr: 'inherit' });
process.once('SIGINT', () => {
  child.kill('SIGINT');
});
process.once('SIGTERM', () => {
  child.kill('SIGTERM');
});
process.exit(await child.exited);
