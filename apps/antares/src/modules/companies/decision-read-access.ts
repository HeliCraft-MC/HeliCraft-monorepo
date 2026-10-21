import type { Transaction } from '../permissions/transaction';
import { personalVoter } from '../voting/read-access';
import { entityVotingParticipants } from '../voting/entity-read';
import type { CompanyProofs } from './decision-proofs';
import type { CompanyActor } from './decision-contracts';
import { assertCompanyReader } from './company-read-access';
import { assertCompanyFinanceReader } from './finance-access';

async function assertDecisionReader(
  transaction: Transaction,
  proof: CompanyProofs,
  actor: CompanyActor,
): Promise<void> {
  if (actor.admin || proof.record.createdBy === actor.id) {
    return;
  }
  for (const vote of proof.votes) {
    // oxlint-disable-next-line no-await-in-loop -- The immutable decision's bounded frozen electorates are checked on the same protected evidence transaction.
    if (await personalVoter(transaction, vote.id, actor.id)) {
      return;
    }
    // oxlint-disable-next-line no-await-in-loop -- Frozen corporate shareholders retain read access through their own current Governance after an ownership transfer.
    const entities = await entityVotingParticipants(transaction, vote.id, actor.id);
    if (entities.length > 0) {
      return;
    }
  }
  await assertCompanyReader(transaction, proof.company.id, actor);
  if (proof.payload.kind === 'TRANSFER_FUNDS') {
    await assertCompanyFinanceReader(transaction, proof.company.id, actor);
  }
}
export { assertDecisionReader };
