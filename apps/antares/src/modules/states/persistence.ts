import { and, eq, inArray } from 'drizzle-orm';

import { states, stateMedia, users, adminAuditLog } from '../../db/schema';
import { DomainError, HTTP } from '../errors';

import type { Transaction } from '../permissions/transaction';

import { readRevision } from './revisions';
import { validateConfiguration } from './domain';
import type { StateConfiguration, Issue } from './contracts';

async function audit(
  transaction: Transaction,
  entry: Readonly<{ actorId: string; targetId: string; action: string; reason: string }>,
): Promise<void> {
  await transaction.insert(adminAuditLog).values({
    actorId: entry.actorId,
    targetId: entry.targetId,
    targetType: 'STATE',
    action: entry.action,
    metadata: { reason: entry.reason },
  });
}
async function stateRecord(
  transaction: Transaction,
  id: string,
): Promise<typeof states.$inferSelect> {
  const [record] = await transaction.select().from(states).where(eq(states.id, id)).for('update');
  if (!record) {
    throw new DomainError(HTTP.notFound, 'STATE_NOT_FOUND', 'Государство не найдено');
  }
  return record;
}
// oxlint-disable-next-line max-lines-per-function -- Submission checks combine references, identity and media ownership in one transaction.
async function validatePersistent(
  transaction: Transaction,
  configuration: Readonly<StateConfiguration>,
  context: Readonly<{ primaryFounderId: string; mediaOwnerId: string; stateId: string | null }>,
): Promise<Issue[]> {
  const issues = validateConfiguration(configuration, context.primaryFounderId);
  const founders = [context.primaryFounderId, ...configuration.cofounderIds];
  const people = await transaction
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, founders), eq(users.status, 'ACTIVE')));
  if (people.length !== new Set(founders).size) {
    issues.push({
      severity: 'ERROR',
      path: 'cofounderIds',
      message: 'Основатель не найден или его аккаунт недоступен',
    });
  }
  const [existing] = await transaction
    .select({ id: states.id })
    .from(states)
    .where(eq(states.slug, configuration.slug));
  if (existing && existing.id !== context.stateId) {
    issues.push({ severity: 'ERROR', path: 'slug', message: 'Этот адрес уже занят' });
  }
  if (
    configuration.horizontalFlag.mode === 'PNG' &&
    configuration.horizontalFlag.mediaId !== null
  ) {
    const [media] = await transaction
      .select()
      .from(stateMedia)
      .where(eq(stateMedia.id, configuration.horizontalFlag.mediaId));
    let retained = false;
    if (context.stateId !== null) {
      const [state] = await transaction.select().from(states).where(eq(states.id, context.stateId));
      if (state?.currentRevisionId !== null && state?.currentRevisionId !== undefined) {
        const current = await readRevision(transaction, state.currentRevisionId);
        retained =
          current.configuration.horizontalFlag.mode === 'PNG' &&
          current.configuration.horizontalFlag.mediaId === configuration.horizontalFlag.mediaId;
      }
    }
    if (!media || (media.ownerId !== context.mediaOwnerId && !retained)) {
      issues.push({
        severity: 'ERROR',
        path: 'horizontalFlag',
        message: 'Флаг не найден в ваших загрузках',
      });
    }
  }
  return issues;
}

export { audit, stateRecord, validatePersistent };
