import type { LegalOwner } from './contracts';

function formationTaskHref(owner: LegalOwner, draftId: string): string {
  if (owner.type === 'PLAYER') {
    return `/app/companies/drafts/${draftId}`;
  }
  if (owner.type === 'STATE') {
    return `/app/states/${owner.id}/manage?section=companies&formationDraftId=${draftId}`;
  }
  return `/app/companies/${owner.id}?section=subsidiaries&formationDraftId=${draftId}`;
}
function sharesTaskHref(owner: LegalOwner, operationId: string): string {
  if (owner.type === 'PLAYER') {
    return `/app/share-operations/${operationId}`;
  }
  if (owner.type === 'STATE') {
    return `/app/states/${owner.id}/manage?section=companies&shareOperationId=${operationId}`;
  }
  return `/app/companies/${owner.id}?section=ownership&shareOperationId=${operationId}`;
}
export { formationTaskHref, sharesTaskHref };
