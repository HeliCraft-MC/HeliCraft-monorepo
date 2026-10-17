import { and, desc, eq, inArray } from 'drizzle-orm';
import type { z } from '@hono/zod-openapi';
import { treatyRevisions, treatyDecisions, treatyActivations } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { HISTORY_LIMIT } from '../monetary/read-models';
import { monetaryError } from '../monetary/domain';
import { parties, treatyRecord, treatyRevision } from './store';
import type { TreatyHistorySchema } from './read-contracts';

async function revisionItems(
  transaction: Transaction,
  rows: readonly (typeof treatyRevisions.$inferSelect)[],
): Promise<z.infer<typeof TreatyHistorySchema>['items']> {
  const items: z.infer<typeof TreatyHistorySchema>['items'] = [];
  for (const row of rows) {
    // oxlint-disable-next-line no-await-in-loop -- Bounded immutable history hydrates on the authorized transaction connection.
    const revision = await treatyRevision(transaction, row.id);
    items.push({
      id: revision.id,
      number: revision.number,
      contentHash: revision.contentHash,
      content: revision.content,
      createdAt: revision.createdAt.toISOString(),
    });
  }
  return items;
}
async function readTreatyHistory(
  transaction: Transaction,
  stateId: string,
  input: Readonly<{ treatyId: string; page: number }>,
): Promise<z.infer<typeof TreatyHistorySchema>> {
  const participants = await parties(transaction, input.treatyId);
  if (!participants.includes(stateId)) {
    monetaryError('TREATY_NOT_FOUND', 'Договор недоступен этому государству');
  }
  const record = await treatyRecord(transaction, input.treatyId);
  const scope =
    record.status === 'DRAFT' && record.proposerStateId !== stateId
      ? inArray(
          treatyRevisions.id,
          transaction.select({ id: treatyActivations.revisionId }).from(treatyActivations),
        )
      : undefined;
  const rows = await transaction
    .select()
    .from(treatyRevisions)
    .where(and(eq(treatyRevisions.treatyId, input.treatyId), scope))
    .orderBy(desc(treatyRevisions.number))
    .limit(HISTORY_LIMIT + 1)
    .offset((input.page - 1) * HISTORY_LIMIT);
  const items = await revisionItems(transaction, rows.slice(0, HISTORY_LIMIT));
  const decisions = await transaction
    .select()
    .from(treatyDecisions)
    .where(
      inArray(
        treatyDecisions.revisionId,
        items.map((item) => item.id),
      ),
    );
  return {
    items,
    decisions: decisions.map((decision) => ({
      directiveId: decision.directiveId,
      revisionId: decision.revisionId,
      stateId: decision.stateId,
      kind: decision.kind,
      createdAt: decision.createdAt.toISOString(),
    })),
    page: input.page,
    hasMore: rows.length > HISTORY_LIMIT,
  };
}
export { readTreatyHistory };
