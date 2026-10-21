// oxlint-disable import/max-dependencies -- Acquisition consent composes immutable operation terms and the existing personal, state and corporate Governance proofs.
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  companyShareConsents,
  companyShareConsentRevocations,
  companyShareAcceptances,
  companyShareEvents,
  legalSubjects,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import type { LegalOwner } from './contracts';
import { ownerKey } from './domain';
import { companyActor, ensureSubject } from './store';
import { shareRecipients } from './share-domain';
import {
  shareOperationRecord,
  assertRegisteredOperation,
  shareOperationContext,
} from './share-context';
import { ShareConsentInputSchema } from './ownership-contracts';
import type { ShareConsentInput, ShareOperation } from './ownership-contracts';

import { usableShareConsent } from './share-consent-proofs';

type ShareConsentRecord = typeof companyShareConsents.$inferSelect;
type ShareConsentSource =
  | Readonly<{ companyDecisionId: string; stateDirectiveId?: never }>
  | Readonly<{ companyDecisionId?: never; stateDirectiveId: string }>;
async function assertAcquisitionRecipient(
  transaction: Transaction,
  input: Readonly<{ operation: ShareOperation; owner: LegalOwner }>,
): Promise<void> {
  if (
    !shareRecipients(input.operation).some(
      (allocation) => ownerKey(allocation.owner) === ownerKey(input.owner),
    )
  ) {
    throw new DomainError(
      HTTP.forbidden,
      'SHARE_RECIPIENT_REQUIRED',
      'Согласие может дать только указанный получатель акций',
    );
  }
  await assertRegisteredOperation(transaction, input.operation);
  await shareOperationContext(transaction, input.operation);
}
async function recordShareConsent(
  transaction: Transaction,
  input: Readonly<{
    operation: ShareOperation;
    owner: LegalOwner;
    actorId: string;
    key: string;
    source?: ShareConsentSource;
  }>,
): Promise<string> {
  await assertAcquisitionRecipient(transaction, input);
  const subjectId = await ensureSubject(transaction, input.owner);
  const id = crypto.randomUUID();
  await transaction.insert(companyShareConsents).values({
    id,
    operationId: input.operation.operationId,
    subjectId,
    actorId: input.actorId,
    companyDecisionId: input.source?.companyDecisionId ?? null,
    stateDirectiveId: input.source?.stateDirectiveId ?? null,
    idempotencyKey: input.key,
    createdAt: sql`clock_timestamp()`,
  });
  return id;
}
async function shareConsentRecord(
  transaction: Transaction,
  id: string,
): Promise<{ consent: ShareConsentRecord; owner: LegalOwner }> {
  const [row] = await transaction
    .select({ consent: companyShareConsents, subject: legalSubjects })
    .from(companyShareConsents)
    .innerJoin(legalSubjects, eq(legalSubjects.id, companyShareConsents.subjectId))
    .where(eq(companyShareConsents.id, id));
  if (!row) {
    throw new DomainError(
      HTTP.notFound,
      'SHARE_CONSENT_NOT_FOUND',
      'Согласие на получение акций не найдено',
    );
  }
  return { consent: row.consent, owner: { type: row.subject.kind, id: row.subject.id } };
}
async function assertShareConsentRevocable(
  transaction: Transaction,
  input: Readonly<{ id: string; owner: LegalOwner }>,
): Promise<ShareConsentRecord> {
  const { consent, owner } = await shareConsentRecord(transaction, input.id);
  if (ownerKey(owner) !== ownerKey(input.owner)) {
    throw new DomainError(
      HTTP.notFound,
      'SHARE_CONSENT_NOT_FOUND',
      'Согласие на получение акций не найдено',
    );
  }
  const [event] = await transaction
    .select({ id: companyShareEvents.id })
    .from(companyShareEvents)
    .where(eq(companyShareEvents.operationId, consent.operationId));
  const [accepted] = await transaction
    .select({ id: companyShareAcceptances.eventId })
    .from(companyShareAcceptances)
    .where(eq(companyShareAcceptances.consentId, consent.id));
  if (event || accepted) {
    throw new DomainError(
      HTTP.conflict,
      'SHARE_ACQUISITION_COMPLETE',
      'Получение акций уже исполнено. Отзыв не изменяет существующую собственность',
    );
  }
  return consent;
}
async function revokeShareConsent(
  transaction: Transaction,
  input: Readonly<{ id: string; owner: LegalOwner; actorId: string; source?: ShareConsentSource }>,
): Promise<void> {
  await assertShareConsentRevocable(transaction, input);
  await transaction
    .insert(companyShareConsentRevocations)
    .values({
      consentId: input.id,
      actorId: input.actorId,
      companyDecisionId: input.source?.companyDecisionId ?? null,
      stateDirectiveId: input.source?.stateDirectiveId ?? null,
      createdAt: sql`clock_timestamp()`,
    })
    .onConflictDoNothing();
}
async function recipientConsent(
  transaction: Transaction,
  operation: ShareOperation,
  owner: LegalOwner,
): Promise<string | null> {
  const rows = await transaction
    .select({ consent: companyShareConsents })
    .from(companyShareConsents)
    .leftJoin(
      companyShareConsentRevocations,
      eq(companyShareConsentRevocations.consentId, companyShareConsents.id),
    )
    .where(
      and(
        eq(companyShareConsents.operationId, operation.operationId),
        eq(companyShareConsents.subjectId, owner.id),
        isNull(companyShareConsentRevocations.consentId),
      ),
    );
  for (const { consent } of rows) {
    // oxlint-disable-next-line no-await-in-loop -- A legal recipient's exact immutable source approval is rechecked under the graph lock at settlement.
    if (await usableShareConsent(transaction, consent, { owner, operation })) {
      return consent.id;
    }
  }
  return null;
}
async function acquisitionConsents(
  transaction: Transaction,
  operation: ShareOperation,
): Promise<{ subjectId: string; consentId: string }[]> {
  const consents: { subjectId: string; consentId: string }[] = [];
  for (const allocation of shareRecipients(operation)) {
    // oxlint-disable-next-line no-await-in-loop -- Every exact receiving lot requires its own real owner consent in the same serialized command.
    const consentId = await recipientConsent(transaction, operation, allocation.owner);
    if (consentId === null) {
      throw new DomainError(
        HTTP.conflict,
        'SHARE_ACQUISITION_CONSENT_REQUIRED',
        'Требуется действительное согласие каждого получателя на точные условия операции',
      );
    }
    consents.push({ subjectId: allocation.owner.id, consentId });
  }
  return consents;
}
class ShareConsentService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async grant(actorId: string, raw: ShareConsentInput): Promise<string> {
    const input = ShareConsentInputSchema.parse(raw);
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const operation = await shareOperationRecord(transaction, input.operationId);
      if (operation.termsHash !== input.termsHash) {
        throw new DomainError(
          HTTP.conflict,
          'SHARE_OPERATION_TERMS_CHANGED',
          'Подтвердите точные сохранённые условия получения акций',
        );
      }
      const [previous] = await transaction
        .select()
        .from(companyShareConsents)
        .where(
          and(
            eq(companyShareConsents.actorId, actorId),
            eq(companyShareConsents.idempotencyKey, input.idempotencyKey),
          ),
        );
      if (previous) {
        if (
          previous.operationId !== operation.id ||
          previous.subjectId !== actorId ||
          previous.companyDecisionId !== null ||
          previous.stateDirectiveId !== null
        ) {
          throw new DomainError(
            HTTP.conflict,
            'IDEMPOTENCY_CONFLICT',
            'Этот ключ использован для другого согласия',
          );
        }
        return previous.id;
      }
      return await recordShareConsent(transaction, {
        operation: operation.terms,
        owner: { type: 'PLAYER', id: actorId },
        actorId,
        key: input.idempotencyKey,
      });
    });
  }
  public async revoke(id: string, actorId: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      await revokeShareConsent(transaction, {
        id,
        owner: { type: 'PLAYER', id: actorId },
        actorId,
      });
    });
  }
}
export {
  ShareConsentService,
  assertAcquisitionRecipient,
  recordShareConsent,
  shareConsentRecord,
  assertShareConsentRevocable,
  revokeShareConsent,
  acquisitionConsents,
  type ShareConsentSource,
};
