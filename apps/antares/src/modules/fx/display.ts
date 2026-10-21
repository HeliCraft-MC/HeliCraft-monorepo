import { eq } from 'drizzle-orm';
import { centralBanks, currencies, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { directiveRecord, hydratePayload } from '../monetary/store';
import { readRevision } from '../states/revisions';
import type { FxOffer } from './read-contracts';

async function fxBankIdentity(transaction: Transaction, bankId: string): Promise<FxOffer['bank']> {
  const [bank] = await transaction.select().from(centralBanks).where(eq(centralBanks.id, bankId));
  if (!bank) {
    throw new Error('Official FX bank missing');
  }
  const payload = await hydratePayload(
    transaction,
    await directiveRecord(transaction, bank.charterDirectiveId),
  );
  const [state] = await transaction
    .select({ revisionId: states.currentRevisionId, status: states.status })
    .from(states)
    .where(eq(states.id, bank.stateId));
  if (!('name' in payload) || state?.revisionId === null || state?.revisionId === undefined) {
    throw new Error('Published bank identity missing');
  }
  const revision = await readRevision(transaction, state.revisionId);
  return {
    id: bank.id,
    stateId: bank.stateId,
    name: payload.name,
    stateName: revision.configuration.name,
    available: bank.status === 'ACTIVE' && state.status === 'ACTIVE',
  };
}
async function fxCurrency(
  transaction: Transaction,
  currencyId: string,
): Promise<FxOffer['currencies'][number]> {
  const [currency] = await transaction
    .select()
    .from(currencies)
    .where(eq(currencies.id, currencyId));
  if (!currency) {
    throw new Error('FX currency identity missing');
  }
  const payload = await hydratePayload(
    transaction,
    await directiveRecord(transaction, currency.directiveId),
  );
  if (payload.kind !== 'CREATE_CURRENCY') {
    throw new Error('FX currency source missing');
  }
  return { id: currency.id, code: currency.code, name: payload.name, status: currency.status };
}
export { fxBankIdentity, fxCurrency };
