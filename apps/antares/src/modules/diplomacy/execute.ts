import { and, desc, eq } from 'drizzle-orm';
import { treaties, treatyDecisions, treatyActivations, monetaryDirectives } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { DirectiveRecord } from '../monetary/store';
import { directiveContext } from '../monetary/directive-context';
import { monetaryError } from '../monetary/domain';
import { parties, treatyRevision } from './store';
import { assertTreatyConflicts, assertTreatyDirective } from './availability';
import type { TreatyDirective } from './contracts';

async function ratificationsCurrent(
  transaction: Transaction,
  payload: TreatyDirective,
  current: DirectiveRecord,
): Promise<boolean> {
  const participants = await parties(transaction, payload.treatyId);
  for (const stateId of participants.filter((id) => id !== current.stateId)) {
    // oxlint-disable-next-line no-await-in-loop -- Each independent party's current Governance evidence must be checked before activation.
    const decisions = await transaction
      .select({ record: monetaryDirectives })
      .from(treatyDecisions)
      .innerJoin(monetaryDirectives, eq(monetaryDirectives.id, treatyDecisions.directiveId))
      .where(
        and(
          eq(treatyDecisions.revisionId, payload.revisionId),
          eq(treatyDecisions.stateId, stateId),
          eq(treatyDecisions.kind, payload.kind),
        ),
      )
      .orderBy(desc(treatyDecisions.createdAt));
    let valid = false;
    for (const decision of decisions) {
      // oxlint-disable-next-line no-await-in-loop -- Older stale signatures cannot substitute for the other state's live proof.
      const context = await directiveContext(transaction, decision.record.id, {
        id: decision.record.createdBy,
        admin: false,
      });
      valid ||= decision.record.status === 'APPLIED' && context.detail.ready;
    }
    if (!valid) {
      return false;
    }
  }
  return true;
}
async function executeTreatyDirective(
  transaction: Transaction,
  record: DirectiveRecord,
  payload: TreatyDirective,
): Promise<void> {
  await assertTreatyDirective(transaction, record.stateId, payload);
  await transaction.insert(treatyDecisions).values({
    directiveId: record.id,
    revisionId: payload.revisionId,
    stateId: record.stateId,
    kind: payload.kind,
  });
  if (payload.kind === 'REJECT_TREATY') {
    await transaction
      .update(treaties)
      .set({ status: 'REJECTED' })
      .where(eq(treaties.id, payload.treatyId));
    return;
  }
  if (!(await ratificationsCurrent(transaction, payload, record))) {
    return;
  }
  if (payload.kind === 'DENOUNCE_TREATY') {
    await transaction
      .update(treaties)
      .set({ status: 'TERMINATED' })
      .where(eq(treaties.id, payload.treatyId));
    return;
  }
  const revision = await treatyRevision(transaction, payload.revisionId);
  if (
    revision.content.expiresAt !== null &&
    new Date(revision.content.expiresAt).getTime() <= Date.now()
  ) {
    monetaryError('TREATY_EXPIRED', 'Срок договора уже истёк');
  }
  await assertTreatyConflicts(transaction, payload.treatyId, revision.content);
  await transaction.insert(treatyActivations).values({ revisionId: payload.revisionId });
  await transaction
    .update(treaties)
    .set({ status: 'ACTIVE', activeRevisionId: payload.revisionId })
    .where(eq(treaties.id, payload.treatyId));
}
export { executeTreatyDirective };
