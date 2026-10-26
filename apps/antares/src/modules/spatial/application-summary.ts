import { eq } from 'drizzle-orm';
import {
  territoryApplications,
  territoryReviews,
  territoryRevisions,
} from '../../db/spatial-schema';
import type { Transaction } from '../permissions/transaction';
import type { TerritorialApplicationSummary } from './contracts';

async function draftApplication(
  transaction: Transaction,
  draftId: string,
): Promise<TerritorialApplicationSummary | null> {
  const [application] = await transaction
    .select({
      id: territoryApplications.id,
      status: territoryApplications.status,
      reason: territoryReviews.reason,
      reviewedAt: territoryReviews.createdAt,
      revisionId: territoryRevisions.id,
    })
    .from(territoryApplications)
    .leftJoin(territoryReviews, eq(territoryReviews.applicationId, territoryApplications.id))
    .leftJoin(territoryRevisions, eq(territoryRevisions.applicationId, territoryApplications.id))
    .where(eq(territoryApplications.draftId, draftId));
  return application
    ? {
        id: application.id,
        status: application.status,
        reason: application.reason,
        reviewedAt: application.reviewedAt?.toISOString() ?? null,
        revisionId: application.revisionId,
      }
    : null;
}
export { draftApplication };
