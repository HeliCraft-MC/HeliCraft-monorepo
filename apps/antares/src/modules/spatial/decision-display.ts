import type { Transaction } from '../permissions/transaction';
import type { DirectivePayload } from '../monetary/contracts';
import { draftRecord, draftView } from './store';
import { analyzeGeometry } from './geometry';
import type { TerritoryDraft, SpatialAnalysis } from './contracts';

async function territorialDecisionDisplay(
  transaction: Transaction,
  payload: DirectivePayload,
): Promise<{ draft: TerritoryDraft; analysis: SpatialAnalysis } | undefined> {
  if (payload.kind !== 'CHANGE_TERRITORY') {
    return undefined;
  }
  const draft = await draftRecord(transaction, payload.draftId);
  if (!draft.geometry) {
    throw new Error('Submitted territorial geometry missing');
  }
  return {
    draft: await draftView(transaction, draft),
    analysis: await analyzeGeometry(transaction, { ...draft, geometry: draft.geometry }),
  };
}
export { territorialDecisionDisplay };
