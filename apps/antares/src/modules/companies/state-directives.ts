// oxlint-disable import/max-dependencies -- Shared state decisions dispatch into company registration, immutable revisions and consent evidence.
import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  companyRegistrationPolicyRevisions,
  companyFormationConsents,
  companyDrafts,
  companyRegistrationApplications,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { DirectiveRecord } from '../monetary/store';
import { DomainError, HTTP } from '../errors';
import { CompanyStateDirectiveSchema } from './registration-contracts';
import type { CompanyStateDirective } from './registration-contracts';
import {
  companyRecord,
  latestRegistrationPolicy,
  ensureSubject,
  changeCompanyStatus,
} from './store';
import { formationHash } from './drafts';
import { assertCompanyFormation } from './domain';
import { readCompanyRevision } from './revisions';
import {
  formationPolicy,
  assertFormationConsents,
  registrationApplication,
} from './formation-context';
import { activateCompany } from './activation';
import { assertEntityBallot } from '../voting/entity-ballots';
import { castBallotInTransaction } from '../voting/ballots';
import {
  isStateShareAction,
  assertStateShareAction,
  executeStateShareAction,
} from './state-share-actions';
import { assertPolicyChange } from './registration-policy';
import { assertBranchReview, reviewCompanyBranch } from './branch-review';

async function assertStateFormationConsent(
  transaction: Transaction,
  stateId: string,
  payload: Extract<CompanyStateDirective, { kind: 'CONSENT_COMPANY_FORMATION' }>,
): Promise<void> {
  const company = await companyRecord(transaction, payload.companyId);
  const [draft] = await transaction
    .select()
    .from(companyDrafts)
    .where(and(eq(companyDrafts.companyId, company.id), isNull(companyDrafts.deletedAt)))
    .orderBy(sql`${companyDrafts.updatedAt} desc`)
    .limit(1);
  if (
    !draft ||
    !['DRAFT', 'PENDING_REGISTRATION', 'REJECTED'].includes(company.status) ||
    formationHash(company.id, draft.configuration) !== payload.formationHash ||
    !draft.configuration.allocations.some(
      (allocation) => allocation.owner.type === 'STATE' && allocation.owner.id === stateId,
    )
  ) {
    throw new DomainError(
      HTTP.conflict,
      'STATE_FORMATION_CONSENT_STALE',
      'Условия учреждения или государственное участие изменились',
    );
  }
  assertCompanyFormation(draft.configuration);
}
async function assertRegistrationReview(
  transaction: Transaction,
  stateId: string,
  payload: Extract<CompanyStateDirective, { kind: 'REVIEW_COMPANY_REGISTRATION' }>,
): Promise<void> {
  const application = await registrationApplication(transaction, payload.applicationId);
  const company = await companyRecord(transaction, application.companyId);
  if (
    application.stateId !== stateId ||
    application.formationHash !== payload.formationHash ||
    application.status !== 'PENDING' ||
    company.currentApplicationId !== application.id ||
    company.status !== 'PENDING_REGISTRATION'
  ) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_APPLICATION_STALE',
      'Заявка не относится к государству или условия изменились',
    );
  }
  if (payload.decision === 'APPROVE') {
    const revision = await readCompanyRevision(transaction, application.revisionId);
    const configuration = {
      ...revision.content,
      registrationStateId: stateId,
      totalShares: application.totalShares,
      allocations: application.allocations,
    };
    const policy = await formationPolicy(transaction, configuration);
    if (policy.id !== application.policyRevisionId) {
      throw new DomainError(
        HTTP.conflict,
        'COMPANY_REGISTRATION_POLICY_STALE',
        'После изменения правил требуется новая регистрационная заявка',
      );
    }
    await assertFormationConsents(transaction, {
      companyId: company.id,
      hash: application.formationHash,
      configuration,
    });
  }
}
async function assertCompanyStateDirective(
  transaction: Transaction,
  stateId: string,
  input: CompanyStateDirective,
): Promise<void> {
  const payload = CompanyStateDirectiveSchema.parse(input);
  if (payload.kind === 'REVIEW_COMPANY_BRANCH') {
    await assertBranchReview(transaction, stateId, payload);
    return;
  }
  if (isStateShareAction(payload)) {
    await assertStateShareAction(transaction, stateId, payload);
    return;
  }
  if (payload.kind === 'SET_COMPANY_REGISTRATION_POLICY') {
    await assertPolicyChange(transaction, stateId, payload);
  } else if (payload.kind === 'CONSENT_COMPANY_FORMATION') {
    await assertStateFormationConsent(transaction, stateId, payload);
  } else if (payload.kind === 'VOTE_AS_SHAREHOLDER') {
    await assertEntityBallot(transaction, stateId, payload);
  } else {
    await assertRegistrationReview(transaction, stateId, payload);
  }
}
async function rejectRegistration(
  transaction: Transaction,
  input: Readonly<{ directiveId: string; actorId: string; applicationId: string; reason: string }>,
): Promise<void> {
  const application = await registrationApplication(transaction, input.applicationId);
  const company = await companyRecord(transaction, application.companyId);
  await transaction
    .update(companyRegistrationApplications)
    .set({
      status: 'REJECTED',
      reviewDirectiveId: input.directiveId,
      reviewedAt: sql`clock_timestamp()`,
    })
    .where(eq(companyRegistrationApplications.id, application.id));
  await changeCompanyStatus(transaction, {
    company,
    actorId: input.actorId,
    status: 'REJECTED',
    reason: input.reason,
    applicationId: application.id,
  });
}
async function recordStateConsent(
  transaction: Transaction,
  record: DirectiveRecord,
  payload: Extract<CompanyStateDirective, { kind: 'CONSENT_COMPANY_FORMATION' }>,
): Promise<void> {
  const subjectId = await ensureSubject(transaction, { type: 'STATE', id: record.stateId });
  await transaction.insert(companyFormationConsents).values({
    companyId: payload.companyId,
    formationHash: payload.formationHash,
    role: 'FOUNDER',
    subjectId,
    actorId: record.createdBy,
    stateDirectiveId: record.id,
    idempotencyKey: record.id,
    createdAt: sql`clock_timestamp()`,
  });
}
type RegistrationDirective = Extract<
  CompanyStateDirective,
  {
    kind:
      | 'SET_COMPANY_REGISTRATION_POLICY'
      | 'CONSENT_COMPANY_FORMATION'
      | 'REVIEW_COMPANY_REGISTRATION';
  }
>;
async function executeRegistrationDirective(
  transaction: Transaction,
  input: Readonly<{ record: DirectiveRecord; actorId: string }>,
  payload: RegistrationDirective,
): Promise<void> {
  const { record, actorId } = input;
  if (payload.kind === 'SET_COMPANY_REGISTRATION_POLICY') {
    const previous = await latestRegistrationPolicy(transaction, record.stateId);
    await transaction.insert(companyRegistrationPolicyRevisions).values({
      stateId: record.stateId,
      number: (previous?.number ?? 0) + 1,
      previousRevisionId: previous?.id ?? null,
      directiveId: record.id,
      policy: payload.policy,
      createdAt: sql`clock_timestamp()`,
    });
  } else if (payload.kind === 'CONSENT_COMPANY_FORMATION') {
    await recordStateConsent(transaction, record, payload);
  } else if (payload.decision === 'APPROVE') {
    await activateCompany(transaction, {
      applicationId: payload.applicationId,
      actorId,
      directiveId: record.id,
    });
  } else {
    await rejectRegistration(transaction, {
      directiveId: record.id,
      actorId,
      reason: payload.reason,
      applicationId: payload.applicationId,
    });
  }
}
async function executeCompanyStateDirective(
  transaction: Transaction,
  input: Readonly<{ record: DirectiveRecord; actorId: string }>,
  payload: CompanyStateDirective,
): Promise<void> {
  const { record, actorId } = input;
  await assertCompanyStateDirective(transaction, record.stateId, payload);
  if (payload.kind === 'REVIEW_COMPANY_BRANCH') {
    await reviewCompanyBranch(transaction, { record, actorId, payload });
    return;
  }
  if (isStateShareAction(payload)) {
    await executeStateShareAction(transaction, { record, actorId, payload });
    return;
  }
  if (payload.kind === 'VOTE_AS_SHAREHOLDER') {
    await castBallotInTransaction(transaction, {
      id: payload.votingId,
      voterId: record.stateId,
      actorId,
      ballot: payload,
      source: { stateDirectiveId: record.id },
    });
    return;
  }
  await executeRegistrationDirective(transaction, input, payload);
}
export { assertCompanyStateDirective, executeCompanyStateDirective };
