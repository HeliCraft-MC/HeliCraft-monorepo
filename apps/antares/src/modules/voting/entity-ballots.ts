import { and, eq } from 'drizzle-orm';
import { votingEligibleVoters, votingBallots } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { lockedVoting, advance } from './persistence';
import { assertVotingElectorate } from './electorates';
import { validateBallot } from './domain';

interface EntityBallot {
  readonly votingId: string;
  readonly choices: readonly string[];
  readonly abstain: boolean;
}
async function assertEntityBallot(
  transaction: Transaction,
  ownerId: string,
  payload: EntityBallot,
): Promise<void> {
  const voting = await advance(
    transaction,
    await lockedVoting(transaction, payload.votingId),
    new Date(),
  );
  await assertVotingElectorate(transaction, voting.configuration.electorate);
  const [voter] = await transaction
    .select()
    .from(votingEligibleVoters)
    .where(
      and(
        eq(votingEligibleVoters.votingId, voting.id),
        eq(votingEligibleVoters.subjectId, ownerId),
      ),
    );
  if (
    voting.status !== 'OPEN' ||
    voting.configuration.electorate.type !== 'COMPANY_SHAREHOLDERS' ||
    !voter
  ) {
    throw new DomainError(
      HTTP.conflict,
      'ENTITY_BALLOT_UNAVAILABLE',
      'Юридическое лицо отсутствует в зафиксированном составе или голосование закрыто',
    );
  }
  const [existing] = await transaction
    .select()
    .from(votingBallots)
    .where(and(eq(votingBallots.votingId, voting.id), eq(votingBallots.voterId, ownerId)));
  if (existing) {
    throw new DomainError(HTTP.conflict, 'ALREADY_VOTED', 'Голос юридического лица уже принят');
  }
  validateBallot(voting.configuration, payload.choices, payload.abstain);
}
export { assertEntityBallot, type EntityBallot };
