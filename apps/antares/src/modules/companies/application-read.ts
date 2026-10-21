// oxlint-disable import/max-dependencies -- Protected registration projections combine immutable legal terms, participant access and the existing state workspace authorization.
import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { companies, companyRegistrationApplications, companyStatusHistory } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assignmentState } from '../states/office-assignment-context';
import { corporateActor } from './decision-commands';
import type { CompanyActor } from './decision-contracts';
import { readCompanyRevision } from './revisions';
import { lockedCompanyDraft } from './drafts';
import { canReadFormation } from './formation-access';
import type { CompanyApplication } from './application-contracts';

const PAGE_SIZE = 20;
type ApplicationRecord = typeof companyRegistrationApplications.$inferSelect;
async function applicationDto(
  transaction: Transaction,
  record: ApplicationRecord,
): Promise<CompanyApplication> {
  const { content } = await readCompanyRevision(transaction, record.revisionId);
  const [company] = await transaction
    .select({ status: companies.status })
    .from(companies)
    .where(eq(companies.id, record.companyId));
  const [history] = await transaction
    .select({ reason: companyStatusHistory.reason })
    .from(companyStatusHistory)
    .where(eq(companyStatusHistory.applicationId, record.id))
    .orderBy(desc(companyStatusHistory.number))
    .limit(1);
  if (company === undefined) {
    throw new Error('Registered application company missing');
  }
  return {
    id: record.id,
    companyId: record.companyId,
    draftId: record.draftId,
    applicantId: record.applicantId,
    stateId: record.stateId,
    formationHash: record.formationHash,
    policyRevisionId: record.policyRevisionId,
    status: record.status,
    companyStatus: company.status,
    reviewDirectiveId: record.reviewDirectiveId,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    reason: history?.reason ?? null,
    configuration: {
      ...content,
      registrationStateId: record.stateId,
      totalShares: record.totalShares,
      allocations: record.allocations,
    },
  };
}
async function assertApplicationReader(
  transaction: Transaction,
  record: ApplicationRecord,
  actor: CompanyActor,
): Promise<void> {
  if (
    actor.admin ||
    record.applicantId === actor.id ||
    (await canReadFormation(
      transaction,
      await lockedCompanyDraft(transaction, record.draftId),
      actor.id,
    ))
  ) {
    return;
  }
  try {
    await assignmentState(transaction, record.stateId, actor);
  } catch (error) {
    if (
      error instanceof DomainError &&
      (error.status === HTTP.forbidden || error.status === HTTP.notFound)
    ) {
      throw new DomainError(
        HTTP.notFound,
        'COMPANY_APPLICATION_NOT_FOUND',
        'Регистрационная заявка не найдена',
      );
    }
    throw error;
  }
}
class CompanyApplicationService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async detail(id: string, actor: CompanyActor): Promise<CompanyApplication> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      const [record] = await transaction
        .select()
        .from(companyRegistrationApplications)
        .where(eq(companyRegistrationApplications.id, id));
      if (record === undefined) {
        throw new DomainError(
          HTTP.notFound,
          'COMPANY_APPLICATION_NOT_FOUND',
          'Регистрационная заявка не найдена',
        );
      }
      await assertApplicationReader(transaction, record, actor);
      return await applicationDto(transaction, record);
    });
  }
  public async state(
    stateId: string,
    actor: CompanyActor,
    page: number,
  ): Promise<{ items: CompanyApplication[]; page: number; hasMore: boolean }> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      await assignmentState(transaction, stateId, actor);
      const rows = await transaction
        .select()
        .from(companyRegistrationApplications)
        .where(and(eq(companyRegistrationApplications.stateId, stateId)))
        .orderBy(
          desc(companyRegistrationApplications.createdAt),
          desc(companyRegistrationApplications.id),
        )
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE);
      const items: CompanyApplication[] = [];
      for (const row of rows.slice(0, PAGE_SIZE)) {
        // oxlint-disable-next-line no-await-in-loop -- A bounded protected application page hydrates immutable terms on one transaction connection.
        items.push(await applicationDto(transaction, row));
      }
      return { items, page, hasMore: rows.length > PAGE_SIZE };
    });
  }
}
export { CompanyApplicationService };
