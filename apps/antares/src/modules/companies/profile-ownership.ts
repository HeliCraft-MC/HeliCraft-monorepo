import { and, asc, eq, gt, isNotNull } from 'drizzle-orm';
import { companies, companyShareBalances, legalSubjects } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { LegalOwnerSchema } from './contracts';
import type { PublishedCompanyProfile } from './profile-contracts';
import { publicLegalIdentity } from './public-subject';
import { controlsCompany } from './share-domain';

const PAGE_SIZE = 20;
async function publicCompanyOwners(
  transaction: Transaction,
  companyId: string,
  page: number,
): Promise<PublishedCompanyProfile['owners']> {
  const rows = await transaction
    .select({ subject: legalSubjects, shares: companyShareBalances.shares })
    .from(companyShareBalances)
    .innerJoin(legalSubjects, eq(legalSubjects.id, companyShareBalances.subjectId))
    .where(and(eq(companyShareBalances.companyId, companyId), gt(companyShareBalances.shares, '0')))
    .orderBy(asc(legalSubjects.id))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
  const items: PublishedCompanyProfile['owners']['items'] = [];
  for (const row of rows.slice(0, PAGE_SIZE)) {
    const owner = LegalOwnerSchema.parse({ type: row.subject.kind, id: row.subject.id });
    // oxlint-disable-next-line no-await-in-loop -- Hydrate public identity labels on the same immutable read snapshot.
    items.push({ identity: await publicLegalIdentity(transaction, owner), shares: row.shares });
  }
  return { items, page, hasMore: rows.length > PAGE_SIZE };
}
async function publicCompanyHoldings(
  transaction: Transaction,
  companyId: string,
  page: number,
): Promise<PublishedCompanyProfile['holdings']> {
  const rows = await transaction
    .select({ company: companies, shares: companyShareBalances.shares })
    .from(companyShareBalances)
    .innerJoin(companies, eq(companies.id, companyShareBalances.companyId))
    .where(
      and(
        eq(companyShareBalances.subjectId, companyId),
        gt(companyShareBalances.shares, '0'),
        isNotNull(companies.foundedAt),
        isNotNull(companies.currentRevisionId),
      ),
    )
    .orderBy(asc(companies.id))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
  const items: PublishedCompanyProfile['holdings']['items'] = [];
  for (const row of rows.slice(0, PAGE_SIZE)) {
    // oxlint-disable-next-line no-await-in-loop -- Ownership exposes published legal identities and exact quantities, never subsidiaries' finances.
    const identity = await publicLegalIdentity(transaction, {
      type: 'COMPANY',
      id: row.company.id,
    });
    items.push({
      identity,
      shares: row.shares,
      issuedShares: row.company.issuedShares,
      controls: controlsCompany(row.shares, row.company.issuedShares),
    });
  }
  return { items, page, hasMore: rows.length > PAGE_SIZE };
}
export { publicCompanyOwners, publicCompanyHoldings };
