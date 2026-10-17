// oxlint-disable max-statements, max-lines-per-function -- The complete state vote includes frozen-voter access after departure before institution ratification.
// oxlint-disable no-magic-numbers, unicorn/no-await-expression-member -- Frozen voter counts and awaited evidence assertions are integration data.
import { expect } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { Database } from '../src/db';
import { votings, votingEligibleVoters, stateMemberships } from '../src/db/schema';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import { BankModerationService } from '../src/modules/monetary/moderation';
import { MonetaryReviewService } from '../src/modules/monetary/review';
import { VotingService } from '../src/modules/voting/service';

async function approveBankEstablishment(
  db: Database['db'],
  fixture: Readonly<{
    stateId: string;
    founderId: string;
    citizenId: string;
    adminId: string;
    previousBankId?: string;
  }>,
  id: string,
): Promise<void> {
  const founder = { id: fixture.founderId, admin: false };
  const directives = new MonetaryDirectiveService(db);
  const details = await directives.detail(id, founder);
  const existing = (await new MonetaryService(db).state(fixture.stateId, founder)).bank;
  if (fixture.previousBankId === undefined) {
    expect(existing).toBeNull();
  } else {
    expect(existing?.id).toBe(fixture.previousBankId);
    expect(existing?.status).toBe('REJECTED');
  }
  await expect(
    directives.apply(id, { id: fixture.adminId, admin: true }, 'Ratification is not a vote'),
  ).rejects.toThrow('Требуются');
  await expect(
    new BankModerationService(db).review(
      fixture.previousBankId ?? crypto.randomUUID(),
      fixture.adminId,
      {
        directiveId: id,
        status: 'ACTIVE',
        reason: 'Cannot bypass vote',
      },
    ),
  ).rejects.toThrow();
  const [vote] = details.votes;
  if (!vote) {
    throw new Error('Missing establishment vote');
  }
  expect(
    await db.select().from(votingEligibleVoters).where(eq(votingEligibleVoters.votingId, vote.id)),
  ).toHaveLength(2);
  const voting = new VotingService(db);
  const detail = await voting.detail(vote.id, fixture.founderId, false);
  const [yes] = detail.input.options;
  if (!yes) {
    throw new Error('Missing approval option');
  }
  await voting.cast(vote.id, fixture.founderId, { choices: [yes.id], abstain: false });
  await db
    .update(stateMemberships)
    .set({ endedAt: sql`clock_timestamp()` })
    .where(eq(stateMemberships.userId, fixture.citizenId));
  expect(
    (
      await new MonetaryReviewService(db).votingPayload(vote.id, {
        id: fixture.citizenId,
        admin: false,
      })
    ).payload.kind,
  ).toBe('ESTABLISH_BANK');
  await voting.cast(vote.id, fixture.citizenId, { choices: [yes.id], abstain: false });
  await db
    .update(stateMemberships)
    .set({ endedAt: null })
    .where(eq(stateMemberships.userId, fixture.citizenId));
  await db
    .update(votings)
    .set({
      opensAt: sql`clock_timestamp() - interval '2 seconds'`,
      closesAt: sql`clock_timestamp() - interval '1 second'`,
    })
    .where(eq(votings.id, vote.id));
  await directives.apply(id, founder);
}
export { approveBankEstablishment };
