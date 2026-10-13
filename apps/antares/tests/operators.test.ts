import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectiveRoles, isOperatorName } from '../src/modules/permissions/operators';

let directory: string | null = null;
async function operatorFile(names: readonly string[]): Promise<string> {
  directory = await mkdtemp(path.join(os.tmpdir(), 'helicraft-operators-'));
  const file = path.join(directory, 'ops.json');
  await writeFile(file, JSON.stringify(names.map((name) => ({ name }))));
  vi.stubEnv('OPS_FILE', file);
  return file;
}
afterEach(async () => {
  vi.unstubAllEnvs();
  if (directory !== null) {
    await rm(directory, { recursive: true, force: true });
    directory = null;
  }
});
describe('root operator policy', () => {
  it('grants ADMIN by case-insensitive nickname without UUID rules and preserves assigned roles', async () => {
    await operatorFile(['ms0ur']);
    expect(effectiveRoles('MS0UR', ['PLAYER'])).toStrictEqual(['PLAYER', 'ADMIN']);
    expect(effectiveRoles('ms0ur', ['PLAYER', 'OWNER', 'ADMIN'])).toStrictEqual([
      'PLAYER',
      'OWNER',
      'ADMIN',
    ]);
    expect(effectiveRoles('Other', ['PLAYER'])).toStrictEqual(['PLAYER']);
  });
  it('reads operator file changes immediately and rejects malformed policy entries', async () => {
    const file = await operatorFile(['ms0ur']);
    expect(isOperatorName('ms0ur')).toBe(true);
    await writeFile(file, '[]');
    expect(isOperatorName('ms0ur')).toBe(false);
    await writeFile(file, '[{"name":"invalid nick","role":"OWNER"}]');
    expect(() => effectiveRoles('ms0ur', ['PLAYER'])).toThrow();
  });
});
