import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { companyFormationConsents, companyConsentRevocations } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assertCompanyFormation } from './domain';
import { companyActor, companyRecord, ensureSubject, companyAudit } from './store';
import { lockedCompanyDraft, formationHash } from './drafts';
import { canReadFormation } from './formation-access';
import type { DraftRecord } from './drafts';

type ConsentRole = 'FOUNDER' | 'OFFICE_HOLDER';
interface PersonalConsent {
  readonly role: ConsentRole;
  readonly formationHash: string;
  readonly idempotencyKey: string;
}
async function previousPersonalConsent(
  transaction: Transaction,
  input: Readonly<{ companyId: string; actorId: string; command: PersonalConsent }>,
): Promise<string | null> {
  const [previous] = await transaction
    .select()
    .from(companyFormationConsents)
    .where(
      and(
        eq(companyFormationConsents.actorId, input.actorId),
        eq(companyFormationConsents.idempotencyKey, input.command.idempotencyKey),
      ),
    );
  if (
    previous &&
    (previous.companyId !== input.companyId ||
      previous.formationHash !== input.command.formationHash ||
      previous.role !== input.command.role ||
      previous.companyDecisionId !== null ||
      previous.stateDirectiveId !== null)
  ) {
    throw new DomainError(
      HTTP.conflict,
      'IDEMPOTENCY_CONFLICT',
      'Этот ключ использован для другого согласия',
    );
  }
  return previous?.id ?? null;
}
async function assertPersonalConsent(
  transaction: Transaction,
  input: Readonly<{ draft: DraftRecord; actorId: string; command: PersonalConsent }>,
): Promise<void> {
  const { draft, actorId, command } = input;
  assertCompanyFormation(draft.configuration);
  const company = await companyRecord(transaction, draft.companyId);
  if (
    !['DRAFT', 'PENDING_REGISTRATION', 'REJECTED'].includes(company.status) ||
    formationHash(company.id, draft.configuration) !== command.formationHash
  ) {
    throw new DomainError(
      HTTP.conflict,
      'FORMATION_STALE',
      'Условия учреждения изменились или регистрация завершена',
    );
  }
  const selected =
    command.role === 'FOUNDER'
      ? draft.configuration.allocations.some(
          (allocation) => allocation.owner.type === 'PLAYER' && allocation.owner.id === actorId,
        )
      : draft.configuration.charter.offices.some((office) =>
          office.initialHolderIds.includes(actorId),
        );
  if (!selected) {
    throw new DomainError(
      HTTP.forbidden,
      'FORMATION_CONSENT_UNAVAILABLE',
      'Согласие может дать только выбранный участник от собственного имени',
    );
  }
}
async function liveFormationConsents(
  transaction: Transaction,
  companyId: string,
  hash: string,
): Promise<(typeof companyFormationConsents.$inferSelect)[]> {
  const rows = await transaction
    .select({ consent: companyFormationConsents })
    .from(companyFormationConsents)
    .leftJoin(
      companyConsentRevocations,
      eq(companyConsentRevocations.consentId, companyFormationConsents.id),
    )
    .where(
      and(
        eq(companyFormationConsents.companyId, companyId),
        eq(companyFormationConsents.formationHash, hash),
        isNull(companyConsentRevocations.consentId),
      ),
    );
  return rows.map((row) => row.consent);
}
class CompanyConsentService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async list(
    draftId: string,
    actorId: string,
  ): Promise<
    {
      id: string;
      role: ConsentRole;
      formationHash: string;
      createdAt: string;
      revokedAt: string | null;
    }[]
  > {
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const draft = await lockedCompanyDraft(transaction, draftId);
      if (!(await canReadFormation(transaction, draft, actorId))) {
        throw new DomainError(
          HTTP.notFound,
          'COMPANY_DRAFT_NOT_FOUND',
          'Черновик компании не найден',
        );
      }
      const rows = await transaction
        .select({
          consent: companyFormationConsents,
          revokedAt: companyConsentRevocations.createdAt,
        })
        .from(companyFormationConsents)
        .leftJoin(
          companyConsentRevocations,
          eq(companyConsentRevocations.consentId, companyFormationConsents.id),
        )
        .where(
          and(
            eq(companyFormationConsents.companyId, draft.companyId),
            eq(companyFormationConsents.actorId, actorId),
            isNull(companyFormationConsents.companyDecisionId),
            isNull(companyFormationConsents.stateDirectiveId),
          ),
        );
      return rows.map(({ consent, revokedAt }) => ({
        id: consent.id,
        role: consent.role,
        formationHash: consent.formationHash,
        createdAt: consent.createdAt.toISOString(),
        revokedAt: revokedAt?.toISOString() ?? null,
      }));
    });
  }
  public async grant(draftId: string, actorId: string, input: PersonalConsent): Promise<string> {
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const draft = await lockedCompanyDraft(transaction, draftId);
      const previous = await previousPersonalConsent(transaction, {
        companyId: draft.companyId,
        actorId,
        command: input,
      });
      if (previous !== null) {
        return previous;
      }
      await assertPersonalConsent(transaction, { draft, actorId, command: input });
      const subjectId = await ensureSubject(transaction, { type: 'PLAYER', id: actorId });
      const id = crypto.randomUUID();
      await transaction.insert(companyFormationConsents).values({
        id,
        companyId: draft.companyId,
        formationHash: input.formationHash,
        role: input.role,
        subjectId,
        actorId,
        idempotencyKey: input.idempotencyKey,
        createdAt: sql`clock_timestamp()`,
      });
      await companyAudit(transaction, {
        actorId,
        companyId: draft.companyId,
        action: 'company.formation.consented',
        reason: input.role,
      });
      return id;
    });
  }
  public async revoke(id: string, actorId: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const [consent] = await transaction
        .select()
        .from(companyFormationConsents)
        .where(
          and(
            eq(companyFormationConsents.id, id),
            eq(companyFormationConsents.actorId, actorId),
            isNull(companyFormationConsents.companyDecisionId),
            isNull(companyFormationConsents.stateDirectiveId),
          ),
        );
      if (!consent) {
        throw new DomainError(HTTP.notFound, 'CONSENT_NOT_FOUND', 'Согласие не найдено');
      }
      const company = await companyRecord(transaction, consent.companyId);
      if (!['DRAFT', 'PENDING_REGISTRATION', 'REJECTED'].includes(company.status)) {
        throw new DomainError(
          HTTP.conflict,
          'REGISTRATION_COMPLETE',
          'Регистрация завершена. Отзыв не изменяет возникшую собственность',
        );
      }
      await transaction
        .insert(companyConsentRevocations)
        .values({ consentId: id, actorId })
        .onConflictDoNothing();
      await companyAudit(transaction, {
        actorId,
        companyId: company.id,
        action: 'company.formation.consent_revoked',
        reason: id,
      });
    });
  }
}
export { CompanyConsentService, liveFormationConsents, type ConsentRole };
