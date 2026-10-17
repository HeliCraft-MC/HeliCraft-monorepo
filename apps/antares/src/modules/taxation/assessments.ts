import { desc, eq } from 'drizzle-orm';
import type { z } from '@hono/zod-openapi';
import { taxAssessments, taxAssessmentClaims, taxLaws } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { HISTORY_LIMIT } from '../monetary/read-models';
import type { TaxAssessmentViewSchema } from './read-contracts';

async function stateAssessments(
  transaction: Transaction,
  stateId: string,
  page: number,
): Promise<z.infer<typeof TaxAssessmentViewSchema>[]> {
  const rows = await transaction
    .selectDistinct({ assessment: taxAssessments })
    .from(taxAssessments)
    .innerJoin(taxAssessmentClaims, eq(taxAssessmentClaims.assessmentId, taxAssessments.id))
    .innerJoin(taxLaws, eq(taxLaws.id, taxAssessmentClaims.lawId))
    .where(eq(taxLaws.stateId, stateId))
    .orderBy(desc(taxAssessments.createdAt), desc(taxAssessments.id))
    .limit(HISTORY_LIMIT + 1)
    .offset((page - 1) * HISTORY_LIMIT);
  return rows.map(({ assessment }) => ({
    id: assessment.id,
    operationId: assessment.operationId,
    currencyId: assessment.currencyId,
    baseMinor: assessment.baseMinor,
    amountMinor: assessment.charge.allocations
      .filter((allocation) => allocation.stateId === stateId)
      .reduce((sum, allocation) => sum + BigInt(allocation.amountMinor), 0n)
      .toString(),
    mode: assessment.charge.mode,
    laws: assessment.charge.claims.map((claim) => ({
      lawId: claim.lawId,
      revisionId: claim.revisionId,
      number: claim.revision,
      name: claim.name,
    })),
    treatyId: assessment.charge.treatyId,
    treatyRevisionId: assessment.charge.treatyRevisionId,
    treatyName: assessment.charge.treatyName,
    createdAt: assessment.createdAt.toISOString(),
  }));
}
export { stateAssessments };
