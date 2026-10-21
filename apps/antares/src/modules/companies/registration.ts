// oxlint-disable import/max-dependencies -- Atomic registration combines drafts, consent, published charter, official fee posting and initial ownership.
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  companies,
  companyDrafts,
  companyRegistrationApplications,
  financialAccounts,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { account, post } from '../monetary/ledger';
import { currencyRecord } from '../monetary/store';
import { monetaryHash } from '../monetary/domain';
import { DomainError, HTTP } from '../errors';
import { companyActor, companyRecord, changeCompanyStatus } from './store';
import { lockedCompanyDraft, assertDraftOwner, assertDraftVersion, formationHash } from './drafts';
import type { DraftRecord } from './drafts';
import { formationPolicy, assertFormationConsents } from './formation-context';
import { publishCompanyRevision } from './revisions';
import { CompanyRevisionContentSchema } from './contracts';
import type { CompanyRegistrationPolicy } from './contracts';
import { CompanySubmitSchema } from './registration-contracts';
import type { CompanySubmit, RegistrationReview } from './registration-contracts';
import { activateCompany } from './activation';

async function assertApplicationFee(
  transaction: Transaction,
  actorId: string,
  policy: CompanyRegistrationPolicy,
): Promise<void> {
  const fee = policy.registrationFee;
  if (fee === null) {
    return;
  }
  const currency = await currencyRecord(transaction, fee.currencyId);
  if (currency.status !== 'ACTIVE') {
    throw new DomainError(
      HTTP.conflict,
      'REGISTRATION_FEE_CURRENCY_BLOCKED',
      'Валюта регистрационного сбора недоступна',
    );
  }
  const [source] = await transaction
    .select({ balance: financialAccounts.balanceMinor })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.kind, 'PLAYER'),
        eq(financialAccounts.ownerId, actorId),
        eq(financialAccounts.currencyId, fee.currencyId),
      ),
    );
  if (BigInt(source?.balance ?? '0') < BigInt(fee.amountMinor)) {
    throw new DomainError(
      HTTP.conflict,
      'REGISTRATION_FEE_UNFUNDED',
      'Недостаточно средств для регистрационного сбора',
    );
  }
}
async function payRegistrationFee(
  transaction: Transaction,
  input: Readonly<{
    applicantId: string;
    applicationId: string;
    stateId: string;
    policyRevisionId: string;
    policy: CompanyRegistrationPolicy;
  }>,
): Promise<string | null> {
  const fee = input.policy.registrationFee;
  if (fee === null) {
    return null;
  }
  const currency = await currencyRecord(transaction, fee.currencyId);
  if (currency.status !== 'ACTIVE') {
    throw new DomainError(
      HTTP.conflict,
      'REGISTRATION_FEE_CURRENCY_BLOCKED',
      'Валюта регистрационного сбора недоступна',
    );
  }
  return await post(transaction, {
    actorId: input.applicantId,
    key: input.applicationId,
    hash: monetaryHash({
      applicationId: input.applicationId,
      policyRevisionId: input.policyRevisionId,
      fee,
    }),
    currency,
    kind: 'TRANSFER',
    amountMinor: fee.amountMinor,
    purpose: `Company registration application ${input.applicationId}`,
    source: await account(transaction, {
      currencyId: currency.id,
      kind: 'PLAYER',
      ownerId: input.applicantId,
    }),
    target: await account(transaction, {
      currencyId: currency.id,
      kind: 'TREASURY',
      ownerId: input.stateId,
    }),
    directiveId: null,
    policyRevisionId: null,
  });
}
async function previousApplication(
  transaction: Transaction,
  input: Readonly<{ draftId: string; actorId: string; command: CompanySubmit }>,
): Promise<string | null> {
  const [previous] = await transaction
    .select()
    .from(companyRegistrationApplications)
    .where(
      and(
        eq(companyRegistrationApplications.applicantId, input.actorId),
        eq(companyRegistrationApplications.idempotencyKey, input.command.idempotencyKey),
      ),
    );
  if (
    previous &&
    previous.commandHash !== monetaryHash({ draftId: input.draftId, ...input.command })
  ) {
    throw new DomainError(
      HTTP.conflict,
      'IDEMPOTENCY_CONFLICT',
      'Этот ключ использован для другой регистрационной заявки',
    );
  }
  return previous?.id ?? null;
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- The pinned registration, consent checks, application fee and optional activation form one atomic command.
async function createApplication(
  transaction: Transaction,
  input: Readonly<{ draft: DraftRecord; actorId: string; command: CompanySubmit }>,
): Promise<string> {
  const { draft, actorId, command } = input;
  assertDraftOwner(draft, actorId);
  assertDraftVersion(draft, command.version);
  const company = await companyRecord(transaction, draft.companyId);
  if (
    !['DRAFT', 'REJECTED'].includes(company.status) ||
    formationHash(company.id, draft.configuration) !== command.formationHash
  ) {
    throw new DomainError(
      HTTP.conflict,
      'FORMATION_STALE',
      'Условия учреждения изменились или заявка уже рассматривается',
    );
  }
  const policy = await formationPolicy(transaction, draft.configuration);
  if (policy.id !== command.policyRevisionId) {
    throw new DomainError(
      HTTP.conflict,
      'COMPANY_REGISTRATION_POLICY_STALE',
      'Правила регистрации изменились. Подтвердите актуальные условия и сбор',
    );
  }
  await assertFormationConsents(transaction, {
    companyId: company.id,
    hash: command.formationHash,
    configuration: draft.configuration,
  });
  const { name, description, categories, charter, document } = draft.configuration;
  const revisionId = await publishCompanyRevision(transaction, {
    companyId: company.id,
    actorId,
    content: CompanyRevisionContentSchema.parse({
      name,
      description,
      categories,
      charter,
      document,
    }),
  });
  const id = crypto.randomUUID();
  const feeJournalId = await payRegistrationFee(transaction, {
    applicantId: actorId,
    applicationId: id,
    stateId: policy.stateId,
    policyRevisionId: policy.id,
    policy: policy.policy,
  });
  await transaction.insert(companyRegistrationApplications).values({
    id,
    companyId: company.id,
    revisionId,
    policyRevisionId: policy.id,
    stateId: policy.stateId,
    applicantId: actorId,
    draftId: draft.id,
    formationHash: command.formationHash,
    totalShares: draft.configuration.totalShares,
    allocations: draft.configuration.allocations,
    idempotencyKey: command.idempotencyKey,
    commandHash: monetaryHash({ draftId: draft.id, ...command }),
    feeJournalId,
  });
  await transaction
    .update(companyDrafts)
    .set({
      submittedApplicationId: id,
      version: draft.version + 1,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(companyDrafts.id, draft.id));
  await transaction
    .update(companies)
    .set({ registrationStateId: policy.stateId, currentApplicationId: id })
    .where(eq(companies.id, company.id));
  await changeCompanyStatus(transaction, {
    company,
    actorId,
    status: 'PENDING_REGISTRATION',
    reason: 'Company registration application submitted',
    applicationId: id,
  });
  if (policy.policy.companyMode === 'FREE') {
    await activateCompany(transaction, { applicationId: id, actorId, directiveId: null });
  }
  return id;
}
class CompanyRegistrationService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async review(draftId: string, actorId: string): Promise<RegistrationReview> {
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const draft = await lockedCompanyDraft(transaction, draftId);
      assertDraftOwner(draft, actorId);
      assertDraftVersion(draft, draft.version);
      const policy = await formationPolicy(transaction, draft.configuration);
      const hash = formationHash(draft.companyId, draft.configuration);
      let problem: string | null = null;
      try {
        await assertFormationConsents(transaction, {
          companyId: draft.companyId,
          hash,
          configuration: draft.configuration,
        });
        await assertApplicationFee(transaction, actorId, policy.policy);
      } catch (error) {
        if (!(error instanceof DomainError)) {
          throw error;
        }
        problem = error.message;
      }
      return {
        companyId: draft.companyId,
        version: draft.version,
        formationHash: hash,
        policyRevisionId: policy.id,
        policy: policy.policy,
        ready: problem === null,
        problem,
      };
    });
  }
  public async submit(draftId: string, actorId: string, input: CompanySubmit): Promise<string> {
    const command = CompanySubmitSchema.parse(input);
    return await this.db.transaction(async (transaction) => {
      await companyActor(transaction, actorId);
      const previous = await previousApplication(transaction, { draftId, actorId, command });
      return (
        previous ??
        (await createApplication(transaction, {
          draft: await lockedCompanyDraft(transaction, draftId),
          actorId,
          command,
        }))
      );
    });
  }
}
export { CompanyRegistrationService, createApplication, payRegistrationFee };
export type { RegistrationReview } from './registration-contracts';
