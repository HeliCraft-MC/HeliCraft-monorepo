// oxlint-disable import/max-dependencies -- Protected branch reads compose existing corporate/state access and allowlisted immutable application/history views.
import { desc, eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { companyBranches } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { assignmentState } from '../states/office-assignment-context';
import type { CompanyActor } from './decision-contracts';
import { corporateActor } from './decision-commands';
import { assertCompanyReader } from './workspace-read';
import { assertBranchReader } from './branch-access';
import { branchRecord, branchApplication } from './branch-context';
import { branchApplicationView, branchSummary, branchHistory, PAGE_SIZE } from './branch-read';
import type { BranchList, BranchDetail, BranchApplicationView } from './branch-read-contracts';

async function branchList(
  transaction: Transaction,
  input: Readonly<{ kind: 'COMPANY' | 'STATE'; id: string; page: number }>,
): Promise<BranchList> {
  const rows = await transaction
    .select()
    .from(companyBranches)
    .where(
      eq(input.kind === 'COMPANY' ? companyBranches.companyId : companyBranches.stateId, input.id),
    )
    .orderBy(desc(companyBranches.createdAt), desc(companyBranches.id))
    .limit(PAGE_SIZE + 1)
    .offset((input.page - 1) * PAGE_SIZE);
  const items: BranchList['items'] = [];
  for (const branch of rows.slice(0, PAGE_SIZE)) {
    // oxlint-disable-next-line no-await-in-loop -- Historical normalized branch text is read sequentially on the protected transaction.
    items.push(await branchSummary(transaction, branch));
  }
  return { items, page: input.page, hasMore: rows.length > PAGE_SIZE };
}
class CompanyBranchService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async company(id: string, actor: CompanyActor, page = 1): Promise<BranchList> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      await assertCompanyReader(transaction, id, actor);
      return await branchList(transaction, { kind: 'COMPANY', id, page });
    });
  }
  public async state(id: string, actor: CompanyActor, page = 1): Promise<BranchList> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      await assignmentState(transaction, id, actor);
      return await branchList(transaction, { kind: 'STATE', id, page });
    });
  }
  public async detail(id: string, actor: CompanyActor, page = 1): Promise<BranchDetail> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      const branch = await branchRecord(transaction, id);
      await assertBranchReader(transaction, branch, actor);
      return {
        branch: await branchSummary(transaction, branch),
        application: await branchApplicationView(
          transaction,
          await branchApplication(transaction, branch.currentApplicationId),
        ),
        history: await branchHistory(transaction, id, page),
      };
    });
  }
  public async application(
    id: string,
    applicationId: string,
    actor: CompanyActor,
  ): Promise<BranchApplicationView> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      const branch = await branchRecord(transaction, id);
      await assertBranchReader(transaction, branch, actor);
      const application = await branchApplication(transaction, applicationId);
      if (application.branchId !== branch.id) {
        throw new DomainError(
          HTTP.notFound,
          'BRANCH_APPLICATION_NOT_FOUND',
          'Заявка филиала не найдена',
        );
      }
      return await branchApplicationView(transaction, application);
    });
  }
}
export { CompanyBranchService };
