// oxlint-disable import/max-dependencies -- The public profile explicitly composes published charter, legal identity and ownership projections without protected finance readers.
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { companies, companyDecisions } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { renderMarkdown } from '../content/markdown';
import { resolveText } from '../localized-content/contracts';
import { companyIdentity } from './public-directory';
import { companyHolders } from './decision-authority';
import { readCompanyRevision } from './revisions';
import { publicCompanyOwners, publicCompanyHoldings } from './profile-ownership';
import { publicLegalIdentity } from './public-subject';
import type { CompanyAction } from './contracts';
import type { CompanyProfileQuery, PublishedCompanyProfile } from './profile-contracts';

const PAGE_SIZE = 20;
const PUBLIC_ACTIONS: readonly CompanyAction[] = [
  'AMEND_CHARTER',
  'UPDATE_PROFILE',
  'CREATE_OFFICE',
  'UPDATE_OFFICE',
  'APPOINT_OFFICE_HOLDER',
  'REMOVE_OFFICE_HOLDER',
  'ISSUE_SHARES',
  'REGISTER_BRANCH',
  'CLOSE_BRANCH',
  'CLOSE_COMPANY',
];
async function publicHistory(
  transaction: Transaction,
  companyId: string,
  page: number,
): Promise<PublishedCompanyProfile['history']> {
  const kind = sql<string>`${companyDecisions.payload}->>'kind'`;
  const rows = await transaction
    .select({ id: companyDecisions.id, kind, appliedAt: companyDecisions.appliedAt })
    .from(companyDecisions)
    .where(
      and(
        eq(companyDecisions.companyId, companyId),
        eq(companyDecisions.status, 'APPLIED'),
        isNotNull(companyDecisions.appliedAt),
        inArray(kind, PUBLIC_ACTIONS),
      ),
    )
    .orderBy(desc(companyDecisions.appliedAt), desc(companyDecisions.id))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
  return {
    page,
    hasMore: rows.length > PAGE_SIZE,
    items: rows.slice(0, PAGE_SIZE).map((row) => {
      if (row.appliedAt === null) {
        throw new Error('Unapplied decision reached the public history');
      }
      return { id: row.id, kind: row.kind, appliedAt: row.appliedAt.toISOString() };
    }),
  };
}
async function publicHolders(
  transaction: Transaction,
  companyId: string,
  officeIds: readonly string[],
): Promise<PublishedCompanyProfile['holders']> {
  const holders = await companyHolders(transaction, companyId);
  const result: PublishedCompanyProfile['holders'] = [];
  for (const holder of holders.filter((row) => officeIds.includes(row.officeId))) {
    // oxlint-disable-next-line no-await-in-loop -- Public office holders use actual player identities from the same snapshot.
    const player = await publicLegalIdentity(transaction, { type: 'PLAYER', id: holder.userId });
    result.push({
      officeId: holder.officeId,
      player,
      since: holder.since.toISOString(),
    });
  }
  return result;
}
class PublicCompanyProfileService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async detail(id: string, query: CompanyProfileQuery): Promise<PublishedCompanyProfile> {
    return await this.db.transaction(
      async (transaction) => {
        const [company] = await transaction
          .select()
          .from(companies)
          .where(
            and(
              eq(companies.id, id),
              isNotNull(companies.foundedAt),
              isNotNull(companies.currentRevisionId),
              inArray(companies.status, ['ACTIVE', 'SUSPENDED', 'CLOSED']),
            ),
          );
        if (company?.currentRevisionId === null || company?.currentRevisionId === undefined) {
          throw new DomainError(HTTP.notFound, 'COMPANY_NOT_FOUND', 'Компания не найдена');
        }
        const { record, content } = await readCompanyRevision(
          transaction,
          company.currentRevisionId,
        );
        return {
          identity: await companyIdentity(transaction, company),
          revisionId: record.id,
          revision: record.number,
          categories: content.categories,
          charter: content.charter,
          documentHtml: await renderMarkdown(resolveText(content.document, query.locale).value),
          issuedShares: company.issuedShares,
          holders: await publicHolders(
            transaction,
            id,
            content.charter.offices.map((office) => office.id),
          ),
          owners: await publicCompanyOwners(transaction, id, query.ownersPage),
          holdings: await publicCompanyHoldings(transaction, id, query.holdingsPage),
          history: await publicHistory(transaction, id, query.historyPage),
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
export { PublicCompanyProfileService };
