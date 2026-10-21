import { asc, eq } from 'drizzle-orm';
import {
  companyShareConsents,
  companyShareConsentRevocations,
  companyShareAcceptances,
  legalSubjects,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError } from '../errors';
import type { ShareOperation } from './ownership-contracts';
import type { ShareAcquisitionConsentView } from './share-read-contracts';
import { shareOperationContext } from './share-context';
import { usableShareConsent } from './share-consent-proofs';

async function operationAvailable(
  transaction: Transaction,
  operation: ShareOperation,
  executed: boolean,
): Promise<boolean> {
  if (executed) {
    return false;
  }
  try {
    await shareOperationContext(transaction, operation);
    return true;
  } catch (error) {
    if (error instanceof DomainError) {
      return false;
    }
    throw error;
  }
}
// oxlint-disable-next-line max-lines-per-function -- Each immutable consent exposes one status derived from its revocation, consumption and current source authority.
async function shareConsentViews(
  transaction: Transaction,
  operation: ShareOperation,
  executed: boolean,
): Promise<ShareAcquisitionConsentView[]> {
  const available = await operationAvailable(transaction, operation, executed);
  const rows = await transaction
    .select({
      consent: companyShareConsents,
      subject: legalSubjects,
      revokedAt: companyShareConsentRevocations.createdAt,
      eventId: companyShareAcceptances.eventId,
    })
    .from(companyShareConsents)
    .innerJoin(legalSubjects, eq(legalSubjects.id, companyShareConsents.subjectId))
    .leftJoin(
      companyShareConsentRevocations,
      eq(companyShareConsentRevocations.consentId, companyShareConsents.id),
    )
    .leftJoin(
      companyShareAcceptances,
      eq(companyShareAcceptances.consentId, companyShareConsents.id),
    )
    .where(eq(companyShareConsents.operationId, operation.operationId))
    .orderBy(asc(companyShareConsents.createdAt), asc(companyShareConsents.id));
  const items: ShareAcquisitionConsentView[] = [];
  for (const row of rows) {
    const owner = { type: row.subject.kind, id: row.subject.id };
    let status: ShareAcquisitionConsentView['status'] = 'STALE';
    if (row.eventId !== null) {
      status = 'CONSUMED';
    } else if (row.revokedAt !== null) {
      status = 'REVOKED';
    } else if (
      available &&
      // oxlint-disable-next-line no-await-in-loop -- Source proofs share one locked transaction.
      (await usableShareConsent(transaction, row.consent, { owner, operation }))
    ) {
      status = 'AVAILABLE';
    }
    items.push({
      id: row.consent.id,
      owner,
      actorId: row.consent.actorId,
      companyDecisionId: row.consent.companyDecisionId,
      stateDirectiveId: row.consent.stateDirectiveId,
      createdAt: row.consent.createdAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString() ?? null,
      eventId: row.eventId,
      status,
    });
  }
  return items;
}
export { shareConsentViews, operationAvailable };
