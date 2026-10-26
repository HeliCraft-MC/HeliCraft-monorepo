import { eq, desc, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  territoryApplications,
  territoryReviews,
  territoryRevisions,
  activeTerritories,
  spatialWorlds,
} from '../../db/spatial-schema';
import type { Transaction } from '../permissions/transaction';
import { authorizeMutation } from '../permissions/transaction';
import { monetaryActor, monetaryAudit } from '../monetary/store';
import { directiveProofs } from '../monetary/directive-proofs';
import { DomainError, HTTP } from '../errors';
import { assertTerritoryDirective } from './directives';
import { draftRecord } from './store';
import { applicationRecord, applicationView } from './applications';
import type { TerritorialApplication } from './applications';

const QUEUE_SIZE = 50;
// oxlint-disable-next-line max-lines-per-function -- Current authority, ratification, immutable revision and SQL publication commit together.
async function publishTerritory(
  transaction: Transaction,
  input: Readonly<{
    application: typeof territoryApplications.$inferSelect;
    actorId: string;
    reason: string;
  }>,
): Promise<string> {
  const { application, actorId, reason } = input;
  const proof = await directiveProofs(transaction, application.directiveId, {
    id: actorId,
    admin: true,
  });
  if (
    proof.record.status !== 'APPLIED' ||
    !proof.ready ||
    proof.stale ||
    proof.payload.kind !== 'CHANGE_TERRITORY'
  ) {
    throw new DomainError(
      HTTP.conflict,
      'TERRITORY_GOVERNANCE_STALE',
      'A current successful state decision is required before ratification',
    );
  }
  const initial = await draftRecord(transaction, application.draftId);
  await transaction
    .select({ id: spatialWorlds.id })
    .from(spatialWorlds)
    .where(eq(spatialWorlds.id, initial.worldId))
    .for('update');
  const draft = await assertTerritoryDirective(transaction, initial.stateId, proof.payload);
  if (!draft.geometry) {
    throw new Error('Territorial geometry missing');
  }
  const [previous] =
    draft.baseRevisionId === null
      ? []
      : await transaction
          .select({ number: territoryRevisions.number })
          .from(territoryRevisions)
          .where(eq(territoryRevisions.id, draft.baseRevisionId));
  await transaction
    .insert(territoryReviews)
    .values({ applicationId: application.id, actorId, decision: 'APPROVE', reason });
  await transaction
    .update(territoryApplications)
    .set({ status: 'APPROVED' })
    .where(eq(territoryApplications.id, application.id));
  const [revision] = await transaction
    .insert(territoryRevisions)
    .values({
      stateId: draft.stateId,
      worldId: draft.worldId,
      previousRevisionId: draft.baseRevisionId,
      number: (previous?.number ?? 0) + 1,
      applicationId: application.id,
      geometry: draft.geometry,
      area: sql`ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(draft.geometry)}),0))`,
      createdBy: proof.record.createdBy,
      ratifiedBy: actorId,
      effectiveAt: sql`clock_timestamp()`,
    })
    .returning({ id: territoryRevisions.id });
  if (!revision) {
    throw new Error('Territorial revision insert failed');
  }
  await transaction
    .insert(activeTerritories)
    .values({ stateId: draft.stateId, worldId: draft.worldId, revisionId: revision.id })
    .onConflictDoUpdate({
      target: [activeTerritories.stateId, activeTerritories.worldId],
      set: { revisionId: revision.id },
    });
  await monetaryAudit(transaction, {
    actorId,
    id: revision.id,
    action: 'territory.published',
    reason,
  });
  return revision.id;
}
class TerritorialRatificationService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async list(actorId: string): Promise<TerritorialApplication[]> {
    return await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'states.manage');
      const queue = await transaction
        .select({ id: territoryApplications.id })
        .from(territoryApplications)
        .orderBy(desc(territoryApplications.createdAt))
        .limit(QUEUE_SIZE);
      const result: TerritorialApplication[] = [];
      for (const item of queue) {
        // oxlint-disable-next-line no-await-in-loop -- Preserve state-lock order on this bounded administration read.
        result.push(await applicationView(transaction, item.id, actorId));
      }
      return result;
    });
  }
  public async detail(id: string, actorId: string): Promise<TerritorialApplication> {
    return await this.db.transaction(async (transaction) => {
      await authorizeMutation(transaction, actorId, 'states.manage');
      return await applicationView(transaction, id, actorId);
    });
  }
  public async review(
    id: string,
    actorId: string,
    input: Readonly<{ decision: 'APPROVE' | 'REJECT'; reason: string }>,
  ): Promise<string | null> {
    const reason = input.reason.trim();
    if (!reason) {
      throw new DomainError(HTTP.badRequest, 'REASON_REQUIRED', 'Explain this decision');
    }
    return await this.db.transaction(async (transaction) => {
      await monetaryActor(transaction, { id: actorId, admin: true });
      const application = await applicationRecord(transaction, id);
      const [prior] = await transaction
        .select()
        .from(territoryReviews)
        .where(eq(territoryReviews.applicationId, id));
      if (prior) {
        if (
          prior.actorId !== actorId ||
          prior.decision !== input.decision ||
          prior.reason !== reason
        ) {
          throw new DomainError(
            HTTP.conflict,
            'TERRITORY_ALREADY_REVIEWED',
            'The territorial application has a final decision',
          );
        }
        const [revision] = await transaction
          .select({ id: territoryRevisions.id })
          .from(territoryRevisions)
          .where(eq(territoryRevisions.applicationId, id));
        return revision?.id ?? null;
      }
      if (input.decision === 'REJECT') {
        await transaction
          .insert(territoryReviews)
          .values({ applicationId: id, actorId, decision: 'REJECT', reason });
        await transaction
          .update(territoryApplications)
          .set({ status: 'REJECTED' })
          .where(eq(territoryApplications.id, id));
        await monetaryAudit(transaction, { actorId, id, action: 'territory.rejected', reason });
        return null;
      }
      return await publishTerritory(transaction, { application, actorId, reason });
    });
  }
}

export { TerritorialRatificationService };
export type { TerritorialApplication } from './applications';
