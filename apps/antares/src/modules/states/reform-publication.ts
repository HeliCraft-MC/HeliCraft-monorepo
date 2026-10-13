// oxlint-disable no-await-in-loop -- Holder corrections retain their chronological intervals on one transaction connection.
import type { StateConfiguration } from './contracts';
import { and, eq, isNull, sql } from 'drizzle-orm';

import {
  stateMemberships,
  stateFounders,
  stateOfficeHolders,
  stateDrafts,
  states,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';

import { DomainError, HTTP } from '../errors';

import { stateRecord, validatePersistent, audit } from './persistence';
import { readRevision, publishRevision } from './revisions';

function sameIdentities(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}
async function applyAdministrativeCorrections(
  transaction: Transaction,
  input: Readonly<{
    stateId: string;
    configuration: StateConfiguration;
    current: StateConfiguration;
  }>,
): Promise<void> {
  await transaction
    .delete(stateFounders)
    .where(and(eq(stateFounders.stateId, input.stateId), eq(stateFounders.type, 'COFOUNDER')));
  if (input.configuration.cofounderIds.length > 0) {
    await transaction.insert(stateFounders).values(
      input.configuration.cofounderIds.map((userId) => ({
        stateId: input.stateId,
        userId,
        type: 'COFOUNDER' as const,
      })),
    );
    await transaction
      .insert(stateMemberships)
      .values(
        input.configuration.cofounderIds.map((userId) => ({ stateId: input.stateId, userId })),
      )
      .onConflictDoUpdate({
        target: [stateMemberships.stateId, stateMemberships.userId],
        set: { endedAt: null },
      });
  }
  for (const office of input.configuration.governance.offices) {
    const previous = input.current.governance.offices.find((item) => item.id === office.id);
    if (
      previous &&
      JSON.stringify(previous.initialHolderIds) !== JSON.stringify(office.initialHolderIds)
    ) {
      await transaction
        .update(stateOfficeHolders)
        .set({ until: sql`transaction_timestamp()` })
        .where(and(eq(stateOfficeHolders.officeId, office.id), isNull(stateOfficeHolders.until)));
      if (office.initialHolderIds.length > 0) {
        await transaction
          .insert(stateOfficeHolders)
          .values(office.initialHolderIds.map((userId) => ({ officeId: office.id, userId })));
      }
    }
  }
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- This composition keeps one atomic workflow or bounded declarative editor together.
async function publishReformRevision(
  transaction: Transaction,
  draft: Readonly<typeof stateDrafts.$inferSelect>,
  decision: Readonly<{ actorId: string; admin: boolean; reason: string }>,
): Promise<string> {
  const { actorId, admin, reason } = decision;
  if (draft.stateId === null) {
    throw new Error('Missing state');
  }
  const state = await stateRecord(transaction, draft.stateId);
  if (state.currentRevisionId === null || state.currentRevisionId !== draft.baseRevisionId) {
    throw new DomainError(HTTP.conflict, 'REFORM_CONFLICT', 'Текущая редакция изменилась');
  }
  const [primary] = await transaction
    .select()
    .from(stateFounders)
    .where(and(eq(stateFounders.stateId, state.id), eq(stateFounders.type, 'PRIMARY')));
  if (!primary) {
    throw new Error('Primary founder missing');
  }
  if (draft.configuration.slug !== state.slug) {
    throw new DomainError(HTTP.badRequest, 'STABLE_SLUG', 'Адрес созданного государства стабилен');
  }
  const issues = await validatePersistent(transaction, draft.configuration, {
    primaryFounderId: primary.userId,
    mediaOwnerId: actorId,
    stateId: state.id,
  });
  if (issues.some((issue) => issue.severity === 'ERROR')) {
    throw new DomainError(
      HTTP.badRequest,
      'INVALID_STATE',
      issues.map((issue) => issue.message).join('; '),
    );
  }
  const current = await readRevision(transaction, state.currentRevisionId);
  if (
    !admin &&
    !sameIdentities(draft.configuration.cofounderIds, current.configuration.cofounderIds)
  ) {
    throw new DomainError(
      HTTP.forbidden,
      'FOUNDERS_ADMIN_ONLY',
      'Основателей исправляет администрация',
    );
  }
  if (
    !admin &&
    draft.configuration.governance.offices.some((office) => {
      const previous = current.configuration.governance.offices.find(
        (item) => item.id === office.id,
      );
      return (
        previous !== undefined &&
        JSON.stringify(previous.initialHolderIds) !== JSON.stringify(office.initialHolderIds)
      );
    })
  ) {
    throw new DomainError(
      HTTP.forbidden,
      'HOLDER_PROCEDURE_REQUIRED',
      'Изменение действующих должностных лиц требует отдельной процедуры',
    );
  }
  const revisionId = await publishRevision(transaction, {
    stateId: state.id,
    number: current.record.number + 1,
    previousRevisionId: state.currentRevisionId,
    actorId,
    adminOverride: admin,
    reason,
    configuration: draft.configuration,
  });
  if (admin) {
    await applyAdministrativeCorrections(transaction, {
      stateId: state.id,
      configuration: draft.configuration,
      current: current.configuration,
    });
  }
  await transaction
    .update(states)
    .set({ currentRevisionId: revisionId })
    .where(eq(states.id, state.id));
  await transaction
    .update(stateDrafts)
    .set({ submittedStateId: state.id, version: draft.version + 1, updatedAt: new Date() })
    .where(eq(stateDrafts.id, draft.id));
  await audit(transaction, {
    actorId,
    targetId: state.id,
    action: admin ? 'state.admin_override' : 'state.reformed',
    reason,
  });
  return revisionId;
}
export { publishReformRevision };
