import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Database } from '../src/db';
import { userRoles } from '../src/db/schema';
import { IdentityService } from '../src/modules/identity/service';
import { SessionService } from '../src/modules/sessions/service';
import { authorizeMutation } from '../src/modules/permissions/transaction';

// oxlint-disable-next-line max-statements -- One real database scenario checks hot operator policy, identity reservation and authorization together.
async function operatorScenario(database: Database): Promise<void> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'helicraft-operators-integration-'));
  const file = path.join(directory, 'ops.json');
  try {
    await writeFile(file, '[]');
    vi.stubEnv('OPS_FILE', file);
    const identity = new IdentityService(database.db);
    const sessions = new SessionService(database.db);
    const operatorToken = await identity.register('OpsPlayer', 'A sufficiently long password');
    const ordinaryToken = await identity.register('OpsOther', 'A sufficiently long password');
    const original = await sessions.authenticate(operatorToken);
    expect(original.principal.roles).toStrictEqual(['PLAYER']);
    await writeFile(file, '[{"name":"OpsPlayer"}]');
    const operator = await sessions.authenticate(operatorToken);
    expect(operator.principal.roles).toContain('ADMIN');
    expect(operator.principal.permissions).toContain('states.manage');
    const persisted = await database.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, operator.principal.id));
    expect(persisted.map((row) => row.role)).toStrictEqual(['PLAYER']);
    await database.db.transaction(async (transaction) => {
      expect(
        await authorizeMutation(transaction, operator.principal.id, 'states.manage'),
      ).toContain('ADMIN');
    });
    const ordinary = await sessions.authenticate(ordinaryToken);
    await expect(
      identity.rename(ordinary.principal.id, 'OPSPLAYER', 'A sufficiently long password'),
    ).rejects.toThrow('оператора');
    await expect(identity.register('OPSPLAYER', 'A sufficiently long password')).rejects.toThrow(
      'зарезервирован',
    );
    await identity.rename(operator.principal.id, 'OpsRenamed', 'A sufficiently long password');
    const renamed = await sessions.authenticate(operatorToken);
    expect(renamed.principal.roles).not.toContain('ADMIN');
    await expect(
      database.db.transaction(
        async (transaction) =>
          await authorizeMutation(transaction, operator.principal.id, 'states.manage'),
      ),
    ).rejects.toThrow();
  } finally {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
}
export { operatorScenario };
