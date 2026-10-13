// oxlint-disable no-await-in-loop -- Snapshot, option and scheduler writes are serialized on transaction connections.
import { eq } from 'drizzle-orm';
import { votings, votingOptions, votingEligibleVoters, adminAuditLog } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { createText, readText } from '../localized-content/service';
import { DomainError, HTTP } from '../errors';
import { eligibleUsers } from './eligibility';
import { validateVoting } from './domain';
import type { VotingInput, VotingSubject } from './contracts';

type VotingRecord = typeof votings.$inferSelect;
async function lockedVoting(transaction: Transaction, id: string): Promise<VotingRecord> {
  const [record] = await transaction.select().from(votings).where(eq(votings.id, id)).for('update');
  if (!record) {
    throw new DomainError(HTTP.notFound, 'VOTING_NOT_FOUND', 'Голосование не найдено');
  }
  return record;
}
async function advance(
  transaction: Transaction,
  record: Readonly<VotingRecord>,
  now: Date,
): Promise<VotingRecord> {
  if (record.status === 'SCHEDULED' && record.opensAt <= now) {
    const ids = await eligibleUsers(transaction, record.configuration.electorate);
    if (ids.length > 0) {
      await transaction
        .insert(votingEligibleVoters)
        .values(ids.map((userId) => ({ votingId: record.id, userId })));
    }
    const status = record.closesAt <= now ? 'CLOSED' : 'OPEN';
    await transaction
      .update(votings)
      .set({ status, snapshotAt: now })
      .where(eq(votings.id, record.id));
    return { ...record, status, snapshotAt: now };
  }
  if (record.status === 'OPEN' && record.closesAt <= now) {
    await transaction.update(votings).set({ status: 'CLOSED' }).where(eq(votings.id, record.id));
    return { ...record, status: 'CLOSED' };
  }
  return record;
}
async function hydrateInput(
  transaction: Transaction,
  record: Readonly<VotingRecord>,
): Promise<VotingInput> {
  const options = await transaction
    .select()
    .from(votingOptions)
    .where(eq(votingOptions.votingId, record.id));
  return {
    ...record.configuration,
    title: await readText(transaction, record.titleTextId),
    description: await readText(transaction, record.descriptionTextId),
    options: await Promise.all(
      record.configuration.options.map(async (option) => {
        const row = options.find((candidate) => candidate.optionKey === option.id);
        if (!row) {
          throw new Error('Voting option missing');
        }
        return { id: option.id, label: await readText(transaction, row.labelTextId) };
      }),
    ),
  };
}
async function persistVoting(
  transaction: Transaction,
  actorId: string,
  input: Readonly<VotingInput>,
): Promise<string> {
  validateVoting(input);
  const id = crypto.randomUUID();
  await transaction.insert(votings).values({
    id,
    createdBy: actorId,
    titleTextId: await createText(transaction, input.title),
    descriptionTextId: await createText(transaction, input.description),
    opensAt: new Date(input.opensAt),
    closesAt: new Date(input.closesAt),
    configuration: {
      ...input,
      title: {},
      description: {},
      options: input.options.map((option) => ({ ...option, label: {} })),
    },
  });
  for (const [position, option] of input.options.entries()) {
    await transaction.insert(votingOptions).values({
      votingId: id,
      optionKey: option.id,
      labelTextId: await createText(transaction, option.label),
      position,
    });
  }
  await transaction
    .insert(adminAuditLog)
    .values({ actorId, targetId: id, targetType: 'VOTING', action: 'voting.created' });
  return id;
}
async function publishVoting(
  transaction: Transaction,
  id: string,
  options: Readonly<{ now?: Date; subject?: VotingSubject; governanceRevisionId?: string }> = {},
): Promise<void> {
  const record = await lockedVoting(transaction, id);
  const now = options.now ?? new Date();
  if (record.status !== 'DRAFT' || record.closesAt <= now) {
    throw new DomainError(
      HTTP.conflict,
      'INVALID_VOTING_STATUS',
      'Голосование нельзя опубликовать',
    );
  }
  await transaction
    .update(votings)
    .set({
      status: 'SCHEDULED',
      subject: options.subject ?? null,
      governanceRevisionId: options.governanceRevisionId ?? null,
    })
    .where(eq(votings.id, id));
  await advance(
    transaction,
    {
      ...record,
      status: 'SCHEDULED',
      subject: options.subject ?? null,
      governanceRevisionId: options.governanceRevisionId ?? null,
    },
    now,
  );
}
export { lockedVoting, advance, hydrateInput, persistVoting, publishVoting };
