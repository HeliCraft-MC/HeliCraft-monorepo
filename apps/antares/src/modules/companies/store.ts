import { and, desc, eq, sql } from 'drizzle-orm';
import {
  companies,
  legalSubjects,
  companyStatusHistory,
  companyRegistrationPolicyRevisions,
  users,
  states,
  adminAuditLog,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryActor } from '../monetary/store';
import { DomainError, HTTP } from '../errors';
import type { CompanyStatus, LegalOwner } from './contracts';

const COMPANY_OWNERSHIP_LOCK = 741_023;
type CompanyRecord = typeof companies.$inferSelect;
async function companyActor(transaction: Transaction, actorId: string): Promise<void> {
  await monetaryActor(transaction, { id: actorId, admin: false });
  // All corporate commands use the same graph lock as share posting triggers, before company/state row locks.
  await transaction.execute(sql`select pg_advisory_xact_lock(${COMPANY_OWNERSHIP_LOCK})`);
}
async function companyRecord(transaction: Transaction, id: string): Promise<CompanyRecord> {
  const [record] = await transaction
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .for('update');
  if (!record) {
    throw new DomainError(HTTP.notFound, 'COMPANY_NOT_FOUND', 'Компания не найдена');
  }
  return record;
}
async function ensureSubject(transaction: Transaction, owner: LegalOwner): Promise<string> {
  let available = false;
  if (owner.type === 'PLAYER') {
    const [player] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, owner.id), eq(users.status, 'ACTIVE')));
    available = player !== undefined;
  } else if (owner.type === 'STATE') {
    const [state] = await transaction
      .select({ id: states.id })
      .from(states)
      .where(and(eq(states.id, owner.id), eq(states.status, 'ACTIVE')));
    available = state !== undefined;
  } else {
    const company = await companyRecord(transaction, owner.id);
    available = company.status === 'ACTIVE';
  }
  if (!available) {
    throw new DomainError(
      HTTP.conflict,
      'LEGAL_SUBJECT_UNAVAILABLE',
      'Юридический субъект не найден или недоступен',
    );
  }
  await transaction
    .insert(legalSubjects)
    .values({
      id: owner.id,
      kind: owner.type,
      playerId: owner.type === 'PLAYER' ? owner.id : null,
      stateId: owner.type === 'STATE' ? owner.id : null,
      companyId: owner.type === 'COMPANY' ? owner.id : null,
    })
    .onConflictDoNothing();
  const [subject] = await transaction
    .select()
    .from(legalSubjects)
    .where(eq(legalSubjects.id, owner.id));
  if (subject?.kind !== owner.type) {
    throw new DomainError(
      HTTP.conflict,
      'LEGAL_IDENTITY_CONFLICT',
      'Юридическая идентичность занята другим субъектом',
    );
  }
  return subject.id;
}
async function latestRegistrationPolicy(
  transaction: Transaction,
  stateId: string,
): Promise<typeof companyRegistrationPolicyRevisions.$inferSelect | null> {
  const [record] = await transaction
    .select()
    .from(companyRegistrationPolicyRevisions)
    .where(eq(companyRegistrationPolicyRevisions.stateId, stateId))
    .orderBy(desc(companyRegistrationPolicyRevisions.number))
    .limit(1);
  return record ?? null;
}
async function companyAudit(
  transaction: Transaction,
  input: Readonly<{ actorId: string; companyId: string; action: string; reason?: string }>,
): Promise<void> {
  await transaction.insert(adminAuditLog).values({
    actorId: input.actorId,
    targetId: input.companyId,
    targetType: 'COMPANY',
    action: input.action,
    metadata: { reason: input.reason ?? '' },
  });
}
async function changeCompanyStatus(
  transaction: Transaction,
  input: Readonly<{
    company: CompanyRecord;
    actorId: string;
    status: CompanyStatus;
    reason: string;
    applicationId?: string;
    revisionId?: string;
    founded?: boolean;
  }>,
): Promise<void> {
  await transaction.insert(companyStatusHistory).values({
    companyId: input.company.id,
    previousStatus: input.company.status,
    status: input.status,
    actorId: input.actorId,
    reason: input.reason,
    applicationId: input.applicationId,
    createdAt: sql`clock_timestamp()`,
  });
  await transaction
    .update(companies)
    .set({
      status: input.status,
      ...(input.revisionId === undefined ? {} : { currentRevisionId: input.revisionId }),
      ...(input.founded === true ? { foundedAt: sql`clock_timestamp()` } : {}),
    })
    .where(eq(companies.id, input.company.id));
  await companyAudit(transaction, {
    actorId: input.actorId,
    companyId: input.company.id,
    action: `company.status.${input.status.toLowerCase()}`,
    reason: input.reason,
  });
}
export {
  COMPANY_OWNERSHIP_LOCK,
  companyActor,
  companyRecord,
  ensureSubject,
  latestRegistrationPolicy,
  companyAudit,
  changeCompanyStatus,
  type CompanyRecord,
};
