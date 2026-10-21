// oxlint-disable import/max-dependencies -- Immutable operation proposals and protected read views combine exact terms, participant access and current consent evidence.
import { eq, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { companyShareOperations, companyShareEvents } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { companyActor } from './store';
import { ShareOperationInputSchema } from './ownership-contracts';
import type { ShareOperationInput } from './ownership-contracts';
import { shareOperationContext, shareOperationRecord, shareOperationExists } from './share-context';
import { mayProposeShares, canReadShareOwner } from './share-access';
import { shareRecipients, shareTermsHash } from './share-domain';
import { shareConsentViews } from './share-consent-read';
import type { ShareOperationView } from './share-read-contracts';
import { shareOperationEvidence } from './share-operation-evidence';

type OperationRecord = typeof companyShareOperations.$inferSelect;
async function insertShareOperation(
  transaction: Transaction,
  input: Readonly<{
    operation: ShareOperationInput['operation'];
    actorId: string;
    key: string;
    hash: string;
  }>,
): Promise<string> {
  const { operation, actorId, key, hash } = input;
  await transaction.insert(companyShareOperations).values({
    id: operation.operationId,
    issuerId: operation.issuerId,
    issuerRevisionId: operation.issuerRevisionId,
    terms: operation,
    termsHash: hash,
    createdBy: actorId,
    idempotencyKey: key,
    createdAt: sql`clock_timestamp()`,
  });
  return operation.operationId;
}
async function assertShareOperationReader(
  transaction: Transaction,
  record: OperationRecord,
  actorId: string,
): Promise<void> {
  if (
    record.createdBy === actorId ||
    (await canReadShareOwner(transaction, { type: 'COMPANY', id: record.issuerId }, actorId))
  ) {
    return;
  }
  const owners = [
    ...shareRecipients(record.terms).map((allocation) => allocation.owner),
    ...(record.terms.kind === 'TRANSFER' ? [record.terms.owner] : []),
  ];
  for (const owner of owners) {
    // oxlint-disable-next-line no-await-in-loop -- Read access comes from actual participating legal entities, never from a supplied representative ID.
    if (await canReadShareOwner(transaction, owner, actorId)) {
      return;
    }
  }
  throw new DomainError(
    HTTP.notFound,
    'SHARE_OPERATION_NOT_FOUND',
    'Операция с акциями не найдена',
  );
}
class ShareOperationService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async create(actorId: string, raw: ShareOperationInput): Promise<string> {
    const input = ShareOperationInputSchema.parse(raw);
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const previous = await shareOperationExists(transaction, actorId, input.idempotencyKey);
      const hash = shareTermsHash(input.operation);
      if (previous) {
        if (previous.termsHash !== hash) {
          throw new DomainError(
            HTTP.conflict,
            'IDEMPOTENCY_CONFLICT',
            'Этот ключ использован для других условий операции',
          );
        }
        return previous.id;
      }
      const [occupied] = await transaction
        .select({ id: companyShareOperations.id })
        .from(companyShareOperations)
        .where(eq(companyShareOperations.id, input.operation.operationId));
      if (occupied) {
        throw new DomainError(
          HTTP.conflict,
          'SHARE_OPERATION_ID_CONFLICT',
          'Идентификатор операции уже используется',
        );
      }
      await shareOperationContext(transaction, input.operation);
      const owner =
        input.operation.kind === 'ISSUE'
          ? { type: 'COMPANY' as const, id: input.operation.issuerId }
          : input.operation.owner;
      if (
        !(await mayProposeShares(transaction, { owner, actorId, intent: input.operation.kind }))
      ) {
        throw new DomainError(
          HTTP.forbidden,
          'SHARE_PROPOSAL_AUTHORITY_REQUIRED',
          'Требуется действительное полномочие владельца или эмитента акций',
        );
      }
      return await insertShareOperation(transaction, {
        operation: input.operation,
        actorId,
        key: input.idempotencyKey,
        hash,
      });
    });
  }
  public async get(id: string, actorId: string): Promise<ShareOperationView> {
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const record = await shareOperationRecord(transaction, id);
      await assertShareOperationReader(transaction, record, actorId);
      const [event] = await transaction
        .select({ id: companyShareEvents.id })
        .from(companyShareEvents)
        .where(eq(companyShareEvents.operationId, id));
      return {
        id,
        operation: record.terms,
        termsHash: record.termsHash,
        createdBy: record.createdBy,
        createdAt: record.createdAt.toISOString(),
        eventId: event?.id ?? null,
        consents: await shareConsentViews(transaction, record.terms, event !== undefined),
        ...(await shareOperationEvidence(transaction, record.terms, event !== undefined)),
      };
    });
  }
}
export { ShareOperationService, assertShareOperationReader };
