import type { Transaction } from '../permissions/transaction';
import type { MonetaryActor } from '../monetary/contracts';
import { stateDirectivePage } from '../monetary/directive-page';
import type { StateFx } from './read-contracts';
import { PAGE_SIZE } from './reader';

async function stateFxDecisions(
  transaction: Transaction,
  input: Readonly<{ stateId: string; actor: MonetaryActor; page: number }>,
): Promise<{ items: StateFx['decisions']; hasMore: boolean }> {
  return await stateDirectivePage(transaction, {
    ...input,
    pageSize: PAGE_SIZE,
    kinds: ['PUBLISH_FX_OFFER', 'CANCEL_FX_OFFER', 'APPROVE_INTERBANK_EXCHANGE'],
  });
}
export { stateFxDecisions };
