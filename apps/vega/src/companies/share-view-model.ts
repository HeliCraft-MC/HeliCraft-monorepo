import type { CompanyShareOperation, LegalOwner, ShareOperationView } from '@helicraft/alhena';

function operationRecipients(operation: CompanyShareOperation): LegalOwner[] {
  return operation.kind === 'ISSUE'
    ? operation.allocations.map((allocation) => allocation.owner)
    : [operation.recipient];
}
function sameLegalOwner(first: LegalOwner, second: LegalOwner): boolean {
  return first.type === second.type && first.id === second.id;
}
function shareRecipientsConsented(view: ShareOperationView): boolean {
  return operationRecipients(view.operation).every((owner) =>
    view.consents.some(
      (consent) => sameLegalOwner(consent.owner, owner) && consent.status === 'AVAILABLE',
    ),
  );
}
export { operationRecipients, sameLegalOwner, shareRecipientsConsented };
