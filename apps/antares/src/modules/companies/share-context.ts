import { and, eq, sql } from 'drizzle-orm';
import { z } from '@hono/zod-openapi';
import { companyShareOperations, companyShareEvents } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { companyRecord, ensureSubject } from './store';
import { assertOwnedShares } from './ownership';
import { readCompanyRevision } from './revisions';
import type { ShareOperation } from './ownership-contracts';
import {
  validateShareOperation,
  shareRecipients,
  assertShareSupply,
  shareTermsHash,
} from './share-domain';

async function shareOperationRecord(
  transaction: Transaction,
  id: string,
): Promise<typeof companyShareOperations.$inferSelect> {
  const [record] = await transaction
    .select()
    .from(companyShareOperations)
    .where(eq(companyShareOperations.id, id));
  if (!record) {
    throw new DomainError(
      HTTP.notFound,
      'SHARE_OPERATION_NOT_FOUND',
      'Операция с акциями не найдена',
    );
  }
  if (
    shareTermsHash(record.terms) !== record.termsHash ||
    record.id !== record.terms.operationId ||
    record.issuerId !== record.terms.issuerId ||
    record.issuerRevisionId !== record.terms.issuerRevisionId
  ) {
    throw new Error('Immutable share operation integrity failure');
  }
  return record;
}
async function assertRegisteredOperation(
  transaction: Transaction,
  operation: ShareOperation,
): Promise<void> {
  const record = await shareOperationRecord(transaction, operation.operationId);
  if (record.termsHash !== shareTermsHash(operation)) {
    throw new DomainError(
      HTTP.conflict,
      'SHARE_OPERATION_TERMS_CHANGED',
      'Условия операции не совпадают с сохранёнными',
    );
  }
  const [event] = await transaction
    .select({ id: companyShareEvents.id })
    .from(companyShareEvents)
    .where(eq(companyShareEvents.operationId, operation.operationId));
  if (event) {
    throw new DomainError(
      HTTP.conflict,
      'SHARE_OPERATION_COMPLETE',
      'Эта операция с акциями уже исполнена',
    );
  }
}
async function assertNoOwnershipCycle(
  transaction: Transaction,
  issuerId: string,
  recipientId: string,
): Promise<void> {
  const result = await transaction.execute(sql`with recursive descendants(id) as (
    select ${issuerId}::uuid union select b.company_id from company_share_balances b
      join legal_subjects s on s.id = b.subject_id join descendants d on d.id = s.company_id
      where s.kind = 'COMPANY' and b.shares > 0
  ) select exists(select 1 from descendants where id = ${recipientId}::uuid) as cycle`);
  if (z.object({ cycle: z.boolean() }).parse(result.rows[0]).cycle) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_OWNERSHIP_CYCLE',
      'Передача создаёт прямой или косвенный цикл владения',
    );
  }
}
async function shareOperationContext(
  transaction: Transaction,
  input: ShareOperation,
): Promise<{
  issuer: Awaited<ReturnType<typeof companyRecord>>;
  content: Awaited<ReturnType<typeof readCompanyRevision>>['content'];
}> {
  const operation = validateShareOperation(input);
  const issuer = await companyRecord(transaction, operation.issuerId);
  if (issuer.status !== 'ACTIVE' || issuer.currentRevisionId !== operation.issuerRevisionId) {
    throw new DomainError(
      HTTP.conflict,
      'SHARE_ISSUER_STALE',
      'Компания не активна или её устав изменился',
    );
  }
  assertShareSupply(issuer.issuedShares, operation);
  if (operation.kind === 'TRANSFER') {
    await ensureSubject(transaction, operation.owner);
    await assertOwnedShares(transaction, {
      companyId: issuer.id,
      subjectId: operation.owner.id,
      shares: operation.shares,
    });
  }
  for (const allocation of shareRecipients(operation)) {
    // oxlint-disable-next-line no-await-in-loop -- Legal identities and graph safety are checked sequentially under the ownership lock.
    await ensureSubject(transaction, allocation.owner);
    if (allocation.owner.type === 'COMPANY') {
      // oxlint-disable-next-line no-await-in-loop -- Reject a cycle before creating a proposal, then the posting trigger rechecks at settlement.
      await assertNoOwnershipCycle(transaction, issuer.id, allocation.owner.id);
    }
  }
  const { content } = await readCompanyRevision(transaction, operation.issuerRevisionId);
  return { issuer, content };
}
async function shareOperationExists(
  transaction: Transaction,
  actorId: string,
  key: string,
): Promise<typeof companyShareOperations.$inferSelect | undefined> {
  const [record] = await transaction
    .select()
    .from(companyShareOperations)
    .where(
      and(
        eq(companyShareOperations.createdBy, actorId),
        eq(companyShareOperations.idempotencyKey, key),
      ),
    );
  return record;
}
export {
  shareOperationRecord,
  assertRegisteredOperation,
  shareOperationContext,
  assertNoOwnershipCycle,
  shareOperationExists,
};
