import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  territoryRevisions,
  territoryApplications,
  territoryDrafts,
  territoryReviews,
  territorialEvents,
} from '../../db/spatial-schema';
import { readText } from '../localized-content/service';
import type { TerritoryHistory, PublishedTerritoryRevision } from './contracts';

const PAGE_SIZE = 10;
class SpatialHistoryService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async list(worldId: string, stateId: string, page: number): Promise<TerritoryHistory> {
    return await this.db.transaction(async (transaction) => {
      const rows = await transaction
        .select({
          revision: territoryRevisions,
          directiveId: territoryApplications.directiveId,
          reasonTextId: territoryDrafts.reasonTextId,
          ratificationReason: territoryReviews.reason,
          worldVersion: territorialEvents.version,
        })
        .from(territoryRevisions)
        .innerJoin(territorialEvents, eq(territorialEvents.revisionId, territoryRevisions.id))
        .innerJoin(
          territoryApplications,
          eq(territoryApplications.id, territoryRevisions.applicationId),
        )
        .innerJoin(territoryDrafts, eq(territoryDrafts.id, territoryApplications.draftId))
        .innerJoin(territoryReviews, eq(territoryReviews.applicationId, territoryApplications.id))
        .where(
          and(eq(territoryRevisions.worldId, worldId), eq(territoryRevisions.stateId, stateId)),
        )
        .orderBy(desc(territoryRevisions.number))
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);
      const items: PublishedTerritoryRevision[] = [];
      for (const row of rows.slice(0, PAGE_SIZE)) {
        items.push({
          id: row.revision.id,
          stateId,
          worldId,
          previousRevisionId: row.revision.previousRevisionId,
          number: row.revision.number,
          applicationId: row.revision.applicationId,
          directiveId: row.directiveId,
          geometry: row.revision.geometry,
          area: row.revision.area,
          createdBy: row.revision.createdBy,
          ratifiedBy: row.revision.ratifiedBy,
          effectiveAt: row.revision.effectiveAt.toISOString(),
          worldVersion: row.worldVersion,
          ratificationReason: row.ratificationReason,
          // oxlint-disable-next-line no-await-in-loop -- Hydrate immutable published reasoning sequentially on the history transaction connection.
          reason: await readText(transaction, row.reasonTextId),
        });
      }
      return { items, page, hasMore: rows.length > PAGE_SIZE };
    });
  }
}
export { SpatialHistoryService };
