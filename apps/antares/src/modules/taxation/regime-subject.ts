import { eq } from 'drizzle-orm';
import { companies, companyBranches } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { LocalizedInput } from '../localized-content/contracts';
import { readCompanyRevision } from '../companies/revisions';
import { branchSummary } from '../companies/branch-read';
import type { TaxRule } from './contracts';

interface RegimeSubject {
  companyName: LocalizedInput;
  branchName: LocalizedInput | null;
}
async function taxRegimeSubject(
  transaction: Transaction,
  rule: TaxRule,
): Promise<RegimeSubject | undefined> {
  if (rule.regime === undefined) {
    return undefined;
  }
  const [company] = await transaction
    .select()
    .from(companies)
    .where(eq(companies.id, rule.regime.companyId));
  if (!company || company.currentRevisionId === null || company.foundedAt === null) {
    throw new Error('Registered tax regime company missing');
  }
  const revision = await readCompanyRevision(transaction, company.currentRevisionId);
  const [branch] =
    rule.regime.branchId === null
      ? []
      : await transaction
          .select()
          .from(companyBranches)
          .where(eq(companyBranches.id, rule.regime.branchId));
  const summary = branch === undefined ? null : await branchSummary(transaction, branch);
  const branchName = summary?.name ?? null;
  return { companyName: revision.content.name, branchName };
}
export { taxRegimeSubject };
