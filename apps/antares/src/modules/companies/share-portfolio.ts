// oxlint-disable import/max-dependencies -- Ownership read models combine real legal subjects, immutable display-name references and existing protected company/state access.
import { and, asc, eq, gt, isNotNull } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  companies,
  companyRevisionTexts,
  companyShareBalances,
  legalSubjects,
} from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { readText } from '../localized-content/service';
import { assignmentState } from '../states/office-assignment-context';
import { corporateActor } from './decision-commands';
import type { CompanyActor } from './decision-contracts';
import type { LegalOwner } from './contracts';
import { assertCompanyReader } from './workspace-read';
import { controlsCompany } from './share-domain';
import type { SharePortfolio } from './share-read-contracts';

const PAGE_SIZE = 20;
interface PortfolioRow {
  issuer: typeof companies.$inferSelect;
  shares: string;
}
async function portfolioRows(
  transaction: Transaction,
  owner: LegalOwner,
  page: number,
): Promise<PortfolioRow[]> {
  return await transaction
    .select({ issuer: companies, shares: companyShareBalances.shares })
    .from(companyShareBalances)
    .innerJoin(companies, eq(companies.id, companyShareBalances.companyId))
    .innerJoin(legalSubjects, eq(legalSubjects.id, companyShareBalances.subjectId))
    .where(
      and(
        eq(legalSubjects.id, owner.id),
        eq(legalSubjects.kind, owner.type),
        gt(companyShareBalances.shares, '0'),
        isNotNull(companies.currentRevisionId),
        isNotNull(companies.foundedAt),
      ),
    )
    .orderBy(asc(companies.id))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
}
async function sharePortfolio(
  transaction: Transaction,
  owner: LegalOwner,
  page: number,
): Promise<SharePortfolio> {
  const rows = await portfolioRows(transaction, owner, page);
  const items: SharePortfolio['items'] = [];
  for (const { issuer, shares } of rows.slice(0, PAGE_SIZE)) {
    if (issuer.currentRevisionId === null) {
      throw new Error('Registered share issuer has no charter');
    }
    // oxlint-disable-next-line no-await-in-loop -- Only immutable published name references are read; owning stock never grants access to issuer finances.
    const [name] = await transaction
      .select({ textId: companyRevisionTexts.textId })
      .from(companyRevisionTexts)
      .where(
        and(
          eq(companyRevisionTexts.revisionId, issuer.currentRevisionId),
          eq(companyRevisionTexts.path, 'name'),
        ),
      );
    if (!name) {
      throw new Error('Published company name missing');
    }
    // oxlint-disable-next-line no-await-in-loop -- Localized display names use the shared normalized content mechanism on the read transaction.
    const displayName = await readText(transaction, name.textId);
    items.push({
      issuerId: issuer.id,
      issuerRevisionId: issuer.currentRevisionId,
      name: displayName,
      status: issuer.status,
      shares,
      issuedShares: issuer.issuedShares,
      controls: controlsCompany(shares, issuer.issuedShares),
    });
  }
  return { items, page, hasMore: rows.length > PAGE_SIZE };
}
class SharePortfolioService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async personal(actor: CompanyActor, page = 1): Promise<SharePortfolio> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      return await sharePortfolio(transaction, { type: 'PLAYER', id: actor.id }, page);
    });
  }
  public async company(companyId: string, actor: CompanyActor, page = 1): Promise<SharePortfolio> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      await assertCompanyReader(transaction, companyId, actor);
      return await sharePortfolio(transaction, { type: 'COMPANY', id: companyId }, page);
    });
  }
  public async state(stateId: string, actor: CompanyActor, page = 1): Promise<SharePortfolio> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      await assignmentState(transaction, stateId, actor);
      return await sharePortfolio(transaction, { type: 'STATE', id: stateId }, page);
    });
  }
}
export { SharePortfolioService, sharePortfolio };
