import { eq } from 'drizzle-orm';
import { territoryApplications, territoryReviews } from '../../db/spatial-schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { directiveContext } from '../monetary/directive-context';
import { draftRecord, draftView } from './store';
import { analyzeGeometry } from './geometry';
import type { TerritoryDraft, SpatialAnalysis } from './contracts';
import type { DirectiveDetail } from '../monetary/contracts';

interface TerritorialApplication {
  readonly id: string;
  readonly status: 'REVIEW' | 'APPROVED' | 'REJECTED';
  readonly draft: TerritoryDraft;
  readonly analysis: SpatialAnalysis;
  readonly decision: DirectiveDetail;
  readonly createdAt: string;
  readonly review: {
    readonly actorId: string;
    readonly decision: 'APPROVE' | 'REJECT';
    readonly reason: string;
    readonly createdAt: string;
  } | null;
}
async function applicationRecord(
  transaction: Transaction,
  id: string,
): Promise<typeof territoryApplications.$inferSelect> {
  const [application] = await transaction
    .select()
    .from(territoryApplications)
    .where(eq(territoryApplications.id, id));
  if (!application) {
    throw new DomainError(
      HTTP.notFound,
      'TERRITORY_APPLICATION_NOT_FOUND',
      'Territorial application not found',
    );
  }
  return application;
}
async function applicationView(
  transaction: Transaction,
  id: string,
  actorId: string,
): Promise<TerritorialApplication> {
  const application = await applicationRecord(transaction, id);
  const draft = await draftRecord(transaction, application.draftId);
  if (!draft.geometry) {
    throw new Error('Submitted geometry missing');
  }
  const context = await directiveContext(transaction, application.directiveId, {
    id: actorId,
    admin: true,
  });
  const [review] = await transaction
    .select()
    .from(territoryReviews)
    .where(eq(territoryReviews.applicationId, id));
  return {
    id,
    status: application.status,
    createdAt: application.createdAt.toISOString(),
    draft: await draftView(transaction, draft),
    decision: context.detail,
    analysis: await analyzeGeometry(transaction, { ...draft, geometry: draft.geometry }),
    review: review
      ? {
          actorId: review.actorId,
          decision: review.decision,
          reason: review.reason,
          createdAt: review.createdAt.toISOString(),
        }
      : null,
  };
}
export { applicationRecord, applicationView, type TerritorialApplication };
