import { desc, isNotNull } from 'drizzle-orm';
import type { Database } from '../../db';
import { companies } from '../../db/schema';
import { DomainError, HTTP } from '../errors';
import { corporateActor } from './decision-commands';
import { assertCompanyReader } from './company-read-access';
import { companyIdentity } from './public-directory';
import type { CompanyActor } from './decision-contracts';
import type { PublishedCompanyIdentity } from './public-contracts';

const PAGE_SIZE = 20;
async function listCompanyWorkspaces(
  db: Database['db'],
  actor: CompanyActor,
  page: number,
): Promise<{ items: PublishedCompanyIdentity[]; page: number; hasMore: boolean }> {
  return await db.transaction(async (transaction) => {
    await corporateActor(transaction, actor);
    const records = await transaction
      .select()
      .from(companies)
      .where(isNotNull(companies.foundedAt))
      .orderBy(desc(companies.foundedAt), desc(companies.id));
    const accessible: typeof records = [];
    for (const record of records) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- Current offices and legal-owner participation use the same authoritative workspace access check before pagination.
        await assertCompanyReader(transaction, record.id, actor);
        accessible.push(record);
      } catch (error) {
        if (!(error instanceof DomainError) || error.status !== HTTP.notFound) {
          throw error;
        }
      }
    }
    const start = (page - 1) * PAGE_SIZE;
    const items: PublishedCompanyIdentity[] = [];
    for (const record of accessible.slice(start, start + PAGE_SIZE)) {
      // oxlint-disable-next-line no-await-in-loop -- Allowed company labels hydrate from published revisions on the same protected snapshot.
      items.push(await companyIdentity(transaction, record));
    }
    return { items, page, hasMore: accessible.length > start + PAGE_SIZE };
  });
}
export { listCompanyWorkspaces };
