import { and, eq, sql } from 'drizzle-orm';
import { companyShareEvents, companySharePostings, companyShareBalances } from '../../db/schema';
import type { companyRegistrationApplications } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryHash } from '../monetary/domain';
import { DomainError, HTTP } from '../errors';
import { ensureSubject } from './store';

async function initialOwnership(
  transaction: Transaction,
  application: typeof companyRegistrationApplications.$inferSelect,
  actorId: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const postings: (typeof companySharePostings.$inferInsert)[] = [];
  for (const allocation of application.allocations) {
    // oxlint-disable-next-line no-await-in-loop -- Every legal owner is verified under the graph lock before its exact initial credit.
    const subjectId = await ensureSubject(transaction, allocation.owner);
    postings.push({
      eventId: id,
      companyId: application.companyId,
      subjectId,
      delta: allocation.shares,
    });
  }
  await transaction.insert(companyShareEvents).values({
    id,
    companyId: application.companyId,
    kind: 'INITIAL',
    shares: application.totalShares,
    applicationId: application.id,
    actorId,
    idempotencyKey: application.id,
    payloadHash: monetaryHash({
      applicationId: application.id,
      formationHash: application.formationHash,
    }),
    createdAt: sql`clock_timestamp()`,
  });
  await transaction.insert(companySharePostings).values(postings);
  return id;
}
async function shareBalance(
  transaction: Transaction,
  companyId: string,
  subjectId: string,
): Promise<bigint> {
  const [record] = await transaction
    .select()
    .from(companyShareBalances)
    .where(
      and(
        eq(companyShareBalances.companyId, companyId),
        eq(companyShareBalances.subjectId, subjectId),
      ),
    )
    .for('update');
  return BigInt(record?.shares ?? '0');
}
async function assertOwnedShares(
  transaction: Transaction,
  input: Readonly<{ companyId: string; subjectId: string; shares: string }>,
): Promise<void> {
  if (
    !/^[1-9][0-9]{0,29}$/u.test(input.shares) ||
    (await shareBalance(transaction, input.companyId, input.subjectId)) < BigInt(input.shares)
  ) {
    throw new DomainError(HTTP.conflict, 'INSUFFICIENT_SHARES', 'Недостаточно акций для передачи');
  }
}
export { initialOwnership, shareBalance, assertOwnedShares };
