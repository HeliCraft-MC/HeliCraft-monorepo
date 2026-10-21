import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  companies,
  states,
  companyBranches,
  companyBranchApplications,
  companyRegistrationPolicyRevisions,
} from '../../db/schema';
import { DomainError, HTTP } from '../errors';
import { branchSummary, PAGE_SIZE } from './branch-read';
import type { PublishedBranchList, PublishedRegistrationPolicy } from './branch-read-contracts';
import type { Transaction } from '../permissions/transaction';
import type { BranchRecord } from './branch-context';
import { readRevision } from '../states/revisions';

async function publishedBranch(
  transaction: Transaction,
  branch: BranchRecord,
): Promise<PublishedBranchList['items'][number]> {
  const current = await branchSummary(transaction, branch);
  const [state] = await transaction
    .select({ revisionId: states.currentRevisionId })
    .from(states)
    .where(eq(states.id, branch.stateId));
  const revision =
    state?.revisionId === null || state?.revisionId === undefined
      ? null
      : await readRevision(transaction, state.revisionId);
  if (current.status !== 'ACTIVE' && current.status !== 'CLOSED') {
    throw new Error('Unpublished branch reached public composition');
  }
  return {
    id: current.id,
    companyId: current.companyId,
    stateId: current.stateId,
    stateName: revision?.configuration.name ?? {},
    status: current.status,
    name: current.name,
    description: current.description,
    createdAt: current.createdAt,
  };
}

class PublicCompanyBranchService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async detail(id: string): Promise<PublishedBranchList['items'][number]> {
    return await this.db.transaction(
      async (transaction) => {
        const [row] = await transaction
          .select({ branch: companyBranches })
          .from(companyBranches)
          .innerJoin(companies, eq(companies.id, companyBranches.companyId))
          .innerJoin(
            companyBranchApplications,
            eq(companyBranchApplications.id, companyBranches.currentApplicationId),
          )
          .where(
            and(
              eq(companyBranches.id, id),
              inArray(companyBranches.status, ['ACTIVE', 'CLOSED']),
              eq(companyBranchApplications.status, 'APPROVED'),
              isNotNull(companies.foundedAt),
            ),
          );
        if (!row) {
          throw new DomainError(
            HTTP.notFound,
            'BRANCH_NOT_FOUND',
            'Опубликованный филиал не найден',
          );
        }
        return await publishedBranch(transaction, row.branch);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  public async policy(stateId: string): Promise<PublishedRegistrationPolicy | null> {
    return await this.db.transaction(
      async (transaction) => {
        const [state] = await transaction
          .select({ id: states.id })
          .from(states)
          .where(
            and(
              eq(states.id, stateId),
              eq(states.status, 'ACTIVE'),
              isNotNull(states.currentRevisionId),
            ),
          );
        if (!state) {
          throw new DomainError(HTTP.notFound, 'STATE_NOT_FOUND', 'Государство не найдено');
        }
        const [policy] = await transaction
          .select()
          .from(companyRegistrationPolicyRevisions)
          .where(eq(companyRegistrationPolicyRevisions.stateId, stateId))
          .orderBy(desc(companyRegistrationPolicyRevisions.number))
          .limit(1);
        return policy
          ? {
              id: policy.id,
              stateId,
              number: policy.number,
              directiveId: policy.directiveId,
              createdAt: policy.createdAt.toISOString(),
              policy: policy.policy,
            }
          : null;
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  public async company(companyId: string, page = 1): Promise<PublishedBranchList> {
    return await this.db.transaction(
      async (transaction) => {
        const [company] = await transaction
          .select({ id: companies.id })
          .from(companies)
          .where(
            and(
              eq(companies.id, companyId),
              isNotNull(companies.foundedAt),
              isNotNull(companies.currentRevisionId),
            ),
          );
        if (!company) {
          throw new DomainError(HTTP.notFound, 'COMPANY_NOT_FOUND', 'Компания не найдена');
        }
        const rows = await transaction
          .select({ branch: companyBranches })
          .from(companyBranches)
          .innerJoin(
            companyBranchApplications,
            eq(companyBranchApplications.id, companyBranches.currentApplicationId),
          )
          .where(
            and(
              eq(companyBranches.companyId, companyId),
              inArray(companyBranches.status, ['ACTIVE', 'CLOSED']),
              eq(companyBranchApplications.status, 'APPROVED'),
            ),
          )
          .orderBy(desc(companyBranches.createdAt), desc(companyBranches.id))
          .limit(PAGE_SIZE + 1)
          .offset((page - 1) * PAGE_SIZE);
        const items: PublishedBranchList['items'] = [];
        for (const { branch } of rows.slice(0, PAGE_SIZE)) {
          // oxlint-disable-next-line no-await-in-loop -- Published normalized labels are read inside one read-only snapshot; no session or private application enters the response.
          items.push(await publishedBranch(transaction, branch));
        }
        return { items, page, hasMore: rows.length > PAGE_SIZE };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
export { PublicCompanyBranchService };
