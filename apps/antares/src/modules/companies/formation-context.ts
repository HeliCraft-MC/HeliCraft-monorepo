// oxlint-disable no-await-in-loop -- Founder identities and consent evidence are validated on one serialized corporate transaction.
// oxlint-disable import/max-dependencies -- Registration validates each legal owner's evidence through the existing state or corporate Governance proof reader.
import { and, eq, isNull } from 'drizzle-orm';
import { stateMemberships, companyRegistrationApplications } from '../../db/schema';
import type { companyFormationConsents } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { stateRecord } from '../states/persistence';
import { directiveProofs } from '../monetary/directive-proofs';
import { DomainError, HTTP } from '../errors';
import { assertCompanyFormation } from './domain';
import { companyRecord, ensureSubject, latestRegistrationPolicy } from './store';
import { liveFormationConsents } from './consents';
import type { CompanyConfiguration, CompanyRegistrationPolicy, LegalOwner } from './contracts';
import { companyDecisionProofs } from './decision-proofs';

type ConsentRecord = typeof companyFormationConsents.$inferSelect;
async function assertDomesticPlayer(
  transaction: Transaction,
  stateId: string,
  userId: string,
): Promise<void> {
  const [membership] = await transaction
    .select()
    .from(stateMemberships)
    .where(
      and(
        eq(stateMemberships.stateId, stateId),
        eq(stateMemberships.userId, userId),
        isNull(stateMemberships.endedAt),
      ),
    );
  if (!membership) {
    throw new DomainError(
      HTTP.conflict,
      'FOREIGN_FOUNDER_RESTRICTED',
      'Политика государства не допускает иностранных учредителей',
    );
  }
}
async function assertFounderJurisdiction(
  transaction: Transaction,
  context: Readonly<{ stateId: string; policy: CompanyRegistrationPolicy }>,
  owner: LegalOwner,
): Promise<void> {
  const { stateId, policy } = context;
  await ensureSubject(transaction, owner);
  if (owner.type === 'PLAYER' && policy.foreignPlayerFounders === 'DENY') {
    await assertDomesticPlayer(transaction, stateId, owner.id);
  }
  if (owner.type === 'COMPANY') {
    const company = await companyRecord(transaction, owner.id);
    if (
      policy.corporateFounders === 'DENY' ||
      (policy.corporateFounders === 'DOMESTIC_ONLY' && company.registrationStateId !== stateId)
    ) {
      throw new DomainError(
        HTTP.conflict,
        'CORPORATE_FOUNDER_RESTRICTED',
        'Корпоративное участие ограничено регистрационной политикой',
      );
    }
  }
  if (
    owner.type === 'STATE' &&
    (policy.stateFounders === 'DENY' ||
      (policy.stateFounders === 'DOMESTIC_ONLY' && owner.id !== stateId))
  ) {
    throw new DomainError(
      HTTP.conflict,
      'STATE_FOUNDER_RESTRICTED',
      'Государственное участие ограничено регистрационной политикой',
    );
  }
}
async function currentConsent(
  transaction: Transaction,
  consent: ConsentRecord,
  owner: LegalOwner,
): Promise<boolean> {
  if (owner.type === 'PLAYER') {
    return (
      consent.actorId === owner.id &&
      consent.companyDecisionId === null &&
      consent.stateDirectiveId === null
    );
  }
  if (owner.type === 'STATE' && consent.stateDirectiveId !== null) {
    const source = await directiveProofs(transaction, consent.stateDirectiveId, {
      id: consent.actorId,
      admin: false,
    });
    return (
      source.record.stateId === owner.id &&
      source.record.status === 'APPLIED' &&
      !source.stale &&
      source.ready &&
      source.payload.kind === 'CONSENT_COMPANY_FORMATION' &&
      source.payload.companyId === consent.companyId &&
      source.payload.formationHash === consent.formationHash
    );
  }
  if (owner.type === 'COMPANY' && consent.companyDecisionId !== null) {
    const source = await companyDecisionProofs(transaction, consent.companyDecisionId);
    return (
      source.record.companyId === owner.id &&
      source.record.status === 'APPLIED' &&
      source.ready &&
      !source.stale &&
      source.payload.kind === 'FOUND_COMPANY' &&
      source.payload.companyId === consent.companyId &&
      source.payload.formationHash === consent.formationHash
    );
  }
  return false;
}
async function assertFormationConsents(
  transaction: Transaction,
  input: Readonly<{ companyId: string; hash: string; configuration: CompanyConfiguration }>,
): Promise<void> {
  const consents = await liveFormationConsents(transaction, input.companyId, input.hash);
  for (const allocation of input.configuration.allocations) {
    const eligible = consents.filter(
      (consent) => consent.role === 'FOUNDER' && consent.subjectId === allocation.owner.id,
    );
    let confirmed = false;
    for (const consent of eligible) {
      if (await currentConsent(transaction, consent, allocation.owner)) {
        confirmed = true;
      }
    }
    if (!confirmed) {
      throw new DomainError(
        HTTP.conflict,
        'FOUNDER_CONSENT_REQUIRED',
        'Требуется действующее согласие каждого учредителя на точные условия',
      );
    }
  }
  const holders = new Set(
    input.configuration.charter.offices.flatMap((office) => office.initialHolderIds),
  );
  for (const userId of holders) {
    await ensureSubject(transaction, { type: 'PLAYER', id: userId });
    if (
      !consents.some(
        (consent) =>
          consent.role === 'OFFICE_HOLDER' &&
          consent.subjectId === userId &&
          consent.actorId === userId &&
          consent.companyDecisionId === null &&
          consent.stateDirectiveId === null,
      )
    ) {
      throw new DomainError(
        HTTP.conflict,
        'OFFICE_CONSENT_REQUIRED',
        'Требуется согласие выбранных должностных лиц',
      );
    }
  }
}
async function formationPolicy(
  transaction: Transaction,
  configuration: CompanyConfiguration,
): Promise<NonNullable<Awaited<ReturnType<typeof latestRegistrationPolicy>>>> {
  assertCompanyFormation(configuration);
  const stateId = configuration.registrationStateId;
  if (stateId === null) {
    throw new Error('Validated registration state missing');
  }
  const state = await stateRecord(transaction, stateId);
  if (state.status !== 'ACTIVE') {
    throw new DomainError(
      HTTP.conflict,
      'REGISTRATION_STATE_INACTIVE',
      'Государство регистрации не активно',
    );
  }
  const revision = await latestRegistrationPolicy(transaction, stateId);
  if (revision === null) {
    throw new DomainError(
      HTTP.conflict,
      'REGISTRATION_POLICY_MISSING',
      'Государство ещё не утвердило правила регистрации компаний через Governance',
    );
  }
  for (const allocation of configuration.allocations) {
    await assertFounderJurisdiction(
      transaction,
      { stateId, policy: revision.policy },
      allocation.owner,
    );
  }
  return revision;
}
async function registrationApplication(
  transaction: Transaction,
  id: string,
): Promise<typeof companyRegistrationApplications.$inferSelect> {
  const [application] = await transaction
    .select()
    .from(companyRegistrationApplications)
    .where(eq(companyRegistrationApplications.id, id))
    .for('update');
  if (!application) {
    throw new DomainError(
      HTTP.notFound,
      'COMPANY_APPLICATION_NOT_FOUND',
      'Регистрационная заявка не найдена',
    );
  }
  return application;
}
export {
  formationPolicy,
  assertFormationConsents,
  assertFounderJurisdiction,
  currentConsent,
  registrationApplication,
};
