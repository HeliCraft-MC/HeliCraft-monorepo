import { eq, sql } from 'drizzle-orm';
import { territoryDrafts, territoryApplications } from '../../db/spatial-schema';
import type { Transaction } from '../permissions/transaction';
import type { DirectiveRecord } from '../monetary/store';
import { DomainError, HTTP } from '../errors';
import type { TerritoryDirective } from './contracts';
import { draftRecord, editableWorld, assertCurrentBase } from './store';
import type { DraftRecord } from './store';
import { analyzeGeometry, assertPublishable } from './geometry';

async function assertTerritoryDirective(
  transaction: Transaction,
  stateId: string,
  payload: TerritoryDirective,
): Promise<DraftRecord> {
  const draft = await draftRecord(transaction, payload.draftId);
  const [integrity] = await transaction
    .select({
      hash: sql<string>`helicraft_territory_draft_digest(${territoryDrafts})`,
    })
    .from(territoryDrafts)
    .where(eq(territoryDrafts.id, draft.id));
  if (
    draft.stateId !== stateId ||
    draft.sealedAt === null ||
    draft.geometry === null ||
    draft.hash !== payload.draftHash ||
    integrity?.hash !== payload.draftHash
  ) {
    throw new DomainError(
      HTTP.conflict,
      'TERRITORY_INTEGRITY',
      'The immutable territorial proposal does not match this decision',
    );
  }
  await editableWorld(transaction, draft.worldId);
  await assertCurrentBase(transaction, draft);
  const analysis = await analyzeGeometry(transaction, { ...draft, geometry: draft.geometry });
  assertPublishable(analysis);
  if (
    (draft.baseRevisionId === null) !== (draft.change === 'INITIAL') ||
    (draft.change === 'EXPAND' && analysis.removedArea > 0) ||
    (draft.change === 'REDUCE' && analysis.addedArea > 0)
  ) {
    throw new DomainError(
      HTTP.conflict,
      'TERRITORY_CHANGE_KIND',
      'The geometry does not match the declared territorial operation',
    );
  }
  return draft;
}
async function executeTerritoryDirective(
  transaction: Transaction,
  record: DirectiveRecord,
  payload: TerritoryDirective,
): Promise<void> {
  const draft = await assertTerritoryDirective(transaction, record.stateId, payload);
  await transaction
    .insert(territoryApplications)
    .values({ draftId: draft.id, directiveId: record.id });
}
export { assertTerritoryDirective, executeTerritoryDirective };
