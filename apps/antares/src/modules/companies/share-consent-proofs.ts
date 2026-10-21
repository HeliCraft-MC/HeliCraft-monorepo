import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { monetaryHash } from '../monetary/domain';
import { directiveProofs } from '../monetary/directive-proofs';
import { companyDecisionProofs } from './decision-proofs';
import type { companyShareConsents } from '../../db/schema';
import type { LegalOwner } from './contracts';
import type { ShareOperation } from './ownership-contracts';

type ShareConsentRecord = typeof companyShareConsents.$inferSelect;
async function consentCurrent(
  transaction: Transaction,
  consent: ShareConsentRecord,
  input: Readonly<{ owner: LegalOwner; operation: ShareOperation }>,
): Promise<boolean> {
  const { owner, operation } = input;
  if (owner.type === 'PLAYER') {
    return (
      consent.actorId === owner.id &&
      consent.companyDecisionId === null &&
      consent.stateDirectiveId === null
    );
  }
  if (owner.type === 'COMPANY' && consent.companyDecisionId !== null) {
    const proof = await companyDecisionProofs(transaction, consent.companyDecisionId);
    return (
      proof.record.companyId === owner.id &&
      proof.record.status === 'APPLIED' &&
      proof.ready &&
      !proof.stale &&
      proof.payload.kind === 'ACCEPT_SHARE_ACQUISITION' &&
      monetaryHash(proof.payload.operation) === monetaryHash(operation)
    );
  }
  if (owner.type === 'STATE' && consent.stateDirectiveId !== null) {
    const proof = await directiveProofs(transaction, consent.stateDirectiveId, {
      id: consent.actorId,
      admin: false,
    });
    return (
      proof.record.stateId === owner.id &&
      proof.record.status === 'APPLIED' &&
      proof.ready &&
      !proof.stale &&
      proof.payload.kind === 'ACCEPT_SHARE_ACQUISITION' &&
      monetaryHash(proof.payload.operation) === monetaryHash(operation)
    );
  }
  return false;
}
async function usableShareConsent(
  transaction: Transaction,
  consent: ShareConsentRecord,
  input: Readonly<{ owner: LegalOwner; operation: ShareOperation }>,
): Promise<boolean> {
  try {
    return await consentCurrent(transaction, consent, input);
  } catch (error) {
    if (
      error instanceof DomainError &&
      (error.status === HTTP.forbidden || error.status === HTTP.notFound)
    ) {
      return false;
    }
    throw error;
  }
}
export { usableShareConsent };
