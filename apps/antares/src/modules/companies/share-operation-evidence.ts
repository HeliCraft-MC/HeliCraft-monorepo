import { and, desc, eq, sql } from 'drizzle-orm';
import { companyDecisions } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError } from '../errors';
import { readCompanyRevision } from './revisions';
import type { ShareOperation } from './ownership-contracts';
import type { ShareOperationView } from './share-read-contracts';
import { operationAvailable } from './share-consent-read';
import { assertIssuerShareApproval } from './share-settlement';

async function availableIssuerApproval(
  transaction: Transaction,
  operation: Extract<ShareOperation, { kind: 'TRANSFER' }>,
): Promise<string | null> {
  const rows = await transaction
    .select({ id: companyDecisions.id })
    .from(companyDecisions)
    .where(
      and(
        eq(companyDecisions.companyId, operation.issuerId),
        eq(companyDecisions.status, 'APPLIED'),
        sql`${companyDecisions.payload}->>'kind' = 'AUTHORIZE_SHARE_TRANSFER'`,
        sql`${companyDecisions.payload}->'operation'->>'operationId' = ${operation.operationId}`,
      ),
    )
    .orderBy(desc(companyDecisions.createdAt), desc(companyDecisions.id));
  for (const row of rows) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- Availability reuses the settlement service's actual current Governance proof and single-consumption check on the same transaction connection.
      await assertIssuerShareApproval(transaction, operation, row.id);
      return row.id;
    } catch (error) {
      if (!(error instanceof DomainError)) {
        throw error;
      }
    }
  }
  return null;
}
async function shareOperationEvidence(
  transaction: Transaction,
  operation: ShareOperation,
  completed: boolean,
): Promise<
  Pick<
    ShareOperationView,
    'termsCurrent' | 'issuerApprovalRequired' | 'availableIssuerApprovalDecisionId'
  >
> {
  const { content } = await readCompanyRevision(transaction, operation.issuerRevisionId);
  const termsCurrent = await operationAvailable(transaction, operation, false);
  return {
    termsCurrent,
    issuerApprovalRequired:
      operation.kind === 'TRANSFER' && content.charter.shareTransfers === 'CORPORATE_APPROVAL',
    availableIssuerApprovalDecisionId:
      !completed && termsCurrent && operation.kind === 'TRANSFER'
        ? await availableIssuerApproval(transaction, operation)
        : null,
  };
}
export { shareOperationEvidence };
