// oxlint-disable import/max-dependencies -- Exact share settlement combines current issuer terms, owner stock, receiver consents and the issuer's actual optional approval.
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { companyShareEvents, companySharePostings, companyShareAcceptances } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { monetaryHash } from '../monetary/domain';
import { companyActor } from './store';
import { companyDecisionProofs } from './decision-proofs';
import type {
  ShareOperation,
  ShareTransfer,
  ShareIssue,
  PersonalShareTransfer,
} from './ownership-contracts';
import { PersonalShareTransferSchema } from './ownership-contracts';
import { assertRegisteredOperation, shareOperationContext } from './share-context';
import { shareCommandHash } from './share-domain';
import { acquisitionConsents } from './share-consents';

interface ShareOwnerSource {
  readonly companyDecisionId?: string;
  readonly stateDirectiveId?: string;
}
async function assertIssuerShareApproval(
  transaction: Transaction,
  operation: ShareTransfer,
  approvalId: string | null,
): Promise<void> {
  const { content } = await shareOperationContext(transaction, operation);
  if (approvalId === null) {
    if (content.charter.shareTransfers === 'CORPORATE_APPROVAL') {
      throw new DomainError(
        HTTP.conflict,
        'SHARE_ISSUER_APPROVAL_REQUIRED',
        'Устав эмитента требует отдельного корпоративного одобрения передачи',
      );
    }
    return;
  }
  const source = await companyDecisionProofs(transaction, approvalId);
  if (
    source.record.companyId !== operation.issuerId ||
    source.record.revisionId !== operation.issuerRevisionId ||
    source.record.status !== 'APPLIED' ||
    !source.ready ||
    source.stale ||
    source.payload.kind !== 'AUTHORIZE_SHARE_TRANSFER' ||
    monetaryHash(source.payload.operation) !== monetaryHash(operation)
  ) {
    throw new DomainError(
      HTTP.conflict,
      'SHARE_ISSUER_APPROVAL_STALE',
      'Одобрение эмитента не относится к этим точным условиям или утратило силу',
    );
  }
  const [used] = await transaction
    .select({ id: companyShareEvents.id })
    .from(companyShareEvents)
    .where(eq(companyShareEvents.authorizationDecisionId, approvalId));
  if (used) {
    throw new DomainError(
      HTTP.conflict,
      'SHARE_ISSUER_APPROVAL_USED',
      'Это одобрение эмитента уже использовано',
    );
  }
}
async function assertShareSettlement(
  transaction: Transaction,
  operation: ShareOperation,
  approvalId: string | null,
): Promise<{ subjectId: string; consentId: string }[]> {
  await assertRegisteredOperation(transaction, operation);
  await shareOperationContext(transaction, operation);
  if (operation.kind === 'TRANSFER') {
    await assertIssuerShareApproval(transaction, operation, approvalId);
  }
  return await acquisitionConsents(transaction, operation);
}
// oxlint-disable-next-line max-lines-per-function -- The single operation, exact ownership postings and consumed legal consents commit or roll back together.
async function settleShares(
  transaction: Transaction,
  input: Readonly<{
    operation: ShareOperation;
    actorId: string;
    key: string;
    source: ShareOwnerSource;
    authorizationDecisionId: string | null;
  }>,
): Promise<string> {
  const { operation, actorId, key, source, authorizationDecisionId } = input;
  const consents = await assertShareSettlement(transaction, operation, authorizationDecisionId);
  const id = operation.operationId;
  await transaction.insert(companyShareEvents).values({
    id,
    operationId: id,
    companyId: operation.issuerId,
    kind: operation.kind,
    shares: operation.shares,
    fromSubjectId: operation.kind === 'TRANSFER' ? operation.owner.id : null,
    toSubjectId: operation.kind === 'TRANSFER' ? operation.recipient.id : null,
    decisionId: source.companyDecisionId ?? null,
    stateDirectiveId: source.stateDirectiveId ?? null,
    authorizationDecisionId,
    actorId,
    idempotencyKey: key,
    payloadHash: shareCommandHash(operation, authorizationDecisionId),
    createdAt: sql`clock_timestamp()`,
  });
  const postings =
    operation.kind === 'ISSUE'
      ? operation.allocations.map((allocation) => ({
          eventId: id,
          companyId: operation.issuerId,
          subjectId: allocation.owner.id,
          delta: allocation.shares,
        }))
      : [
          {
            eventId: id,
            companyId: operation.issuerId,
            subjectId: operation.owner.id,
            delta: `-${operation.shares}`,
          },
          {
            eventId: id,
            companyId: operation.issuerId,
            subjectId: operation.recipient.id,
            delta: operation.shares,
          },
        ];
  await transaction.insert(companySharePostings).values(postings);
  await transaction.insert(companyShareAcceptances).values(
    consents.map((consent) => ({
      eventId: id,
      subjectId: consent.subjectId,
      consentId: consent.consentId,
    })),
  );
  return id;
}
async function settleShareIssue(
  transaction: Transaction,
  input: Readonly<{ operation: ShareIssue; actorId: string; decisionId: string }>,
): Promise<string> {
  return await settleShares(transaction, {
    operation: input.operation,
    actorId: input.actorId,
    key: input.decisionId,
    source: { companyDecisionId: input.decisionId },
    authorizationDecisionId: null,
  });
}
async function settleShareTransfer(
  transaction: Transaction,
  input: Readonly<{
    operation: ShareTransfer;
    actorId: string;
    key: string;
    source: ShareOwnerSource;
    authorizationDecisionId: string | null;
  }>,
): Promise<string> {
  return await settleShares(transaction, input);
}
class PersonalShareService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async transfer(actorId: string, raw: PersonalShareTransfer): Promise<string> {
    const input = PersonalShareTransferSchema.parse(raw);
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      if (input.operation.owner.type !== 'PLAYER' || input.operation.owner.id !== actorId) {
        throw new DomainError(
          HTTP.forbidden,
          'PERSONAL_SHARE_OWNER_REQUIRED',
          'Игрок может передать только собственные акции',
        );
      }
      const hash = shareCommandHash(input.operation, input.authorizationDecisionId);
      const [prior] = await transaction
        .select()
        .from(companyShareEvents)
        .where(
          and(
            eq(companyShareEvents.actorId, actorId),
            eq(companyShareEvents.idempotencyKey, input.idempotencyKey),
          ),
        );
      if (prior) {
        if (prior.payloadHash !== hash) {
          throw new DomainError(
            HTTP.conflict,
            'IDEMPOTENCY_CONFLICT',
            'Этот ключ использован для другой передачи акций',
          );
        }
        return prior.id;
      }
      return await settleShareTransfer(transaction, {
        operation: input.operation,
        actorId,
        key: input.idempotencyKey,
        source: {},
        authorizationDecisionId: input.authorizationDecisionId,
      });
    });
  }
}
export {
  PersonalShareService,
  assertIssuerShareApproval,
  assertShareSettlement,
  settleShareIssue,
  settleShareTransfer,
};
