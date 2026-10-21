// oxlint-disable import/max-dependencies -- The protected workspace combines normalized legal identity, ownership, offices and capabilities derived by existing authority services.
import { and, eq, gt } from 'drizzle-orm';
import type { Database } from '../../db';
import { companyShareBalances, legalSubjects } from '../../db/schema';
import { companyHolders } from './decision-authority';
import { assertCompanyReader } from './company-read-access';
import { corporateActor } from './decision-commands';
import { readCompanyRevision } from './revisions';
import { LegalOwnerSchema } from './contracts';
import type { CompanyActor } from './decision-contracts';
import type { CompanyWorkspace } from './read-contracts';
import { workspaceCapabilities } from './workspace-capabilities';

class CompanyWorkspaceService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async detail(companyId: string, actor: CompanyActor): Promise<CompanyWorkspace> {
    return await this.db.transaction(async (transaction) => {
      await corporateActor(transaction, actor);
      const company = await assertCompanyReader(transaction, companyId, actor);
      if (company.currentRevisionId === null || company.registrationStateId === null) {
        throw new Error('Registered company identity incomplete');
      }
      const { content } = await readCompanyRevision(transaction, company.currentRevisionId);
      const holders = await companyHolders(transaction, companyId);
      const positions = await transaction
        .select({ subject: legalSubjects, shares: companyShareBalances.shares })
        .from(companyShareBalances)
        .innerJoin(legalSubjects, eq(legalSubjects.id, companyShareBalances.subjectId))
        .where(
          and(eq(companyShareBalances.companyId, companyId), gt(companyShareBalances.shares, '0')),
        );
      return {
        id: company.id,
        status: company.status,
        currentRevisionId: company.currentRevisionId,
        registrationStateId: company.registrationStateId,
        issuedShares: company.issuedShares,
        ...(await workspaceCapabilities(transaction, {
          companyId: company.id,
          status: company.status,
          actor,
          charter: content.charter,
        })),
        content,
        holders: holders
          .filter((holder) =>
            content.charter.offices.some((office) => office.id === holder.officeId),
          )
          .map((holder) => ({
            id: holder.id,
            officeId: holder.officeId,
            userId: holder.userId,
            since: holder.since.toISOString(),
          })),
        shareholders: positions.map(({ subject, shares }) => ({
          owner: LegalOwnerSchema.parse({ type: subject.kind, id: subject.id }),
          shares,
        })),
      };
    });
  }
}
export { CompanyWorkspaceService };
export { assertCompanyReader } from './company-read-access';
