import { and, asc, eq, gt, isNotNull, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { companies, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { DomainError, HTTP } from '../errors';
import { readCompanyRevision } from './revisions';
import { readRevision } from '../states/revisions';
import type { PublishedCompanyIdentity, PublishedCompanyDirectory } from './public-contracts';

const PAGE_SIZE = 20;
async function companyIdentity(
  transaction: Transaction,
  company: typeof companies.$inferSelect,
): Promise<PublishedCompanyIdentity> {
  if (
    company.currentRevisionId === null ||
    company.registrationStateId === null ||
    company.foundedAt === null
  ) {
    throw new Error('Unpublished company reached public identity reader');
  }
  const revision = await readCompanyRevision(transaction, company.currentRevisionId);
  const [state] = await transaction
    .select({ revisionId: states.currentRevisionId, slug: states.slug })
    .from(states)
    .where(eq(states.id, company.registrationStateId));
  const jurisdiction =
    state?.revisionId === null || state?.revisionId === undefined
      ? null
      : await readRevision(transaction, state.revisionId);
  return {
    id: company.id,
    registrationStateId: company.registrationStateId,
    registrationStateName: jurisdiction?.configuration.name ?? {},
    status: company.status,
    ...(revision.content.branding === undefined ? {} : { branding: revision.content.branding }),
    registrationStateSlug: state?.slug,
    registrationStateColor: jurisdiction?.configuration.color,
    name: revision.content.name,
    description: revision.content.description,
    foundedAt: company.foundedAt.toISOString(),
  };
}
class PublicCompanyDirectoryService {
  private readonly db: Database['db'];
  public constructor(db: Database['db']) {
    this.db = db;
  }
  public async list(
    input: Readonly<{ query: string; after?: string }>,
  ): Promise<PublishedCompanyDirectory> {
    return await this.db.transaction(
      async (transaction) => {
        const rows = await transaction
          .select()
          .from(companies)
          .where(
            and(
              eq(companies.status, 'ACTIVE'),
              isNotNull(companies.foundedAt),
              isNotNull(companies.currentRevisionId),
              input.after === undefined ? undefined : gt(companies.id, input.after),
              sql`exists (select 1 from company_revision_texts t join localized_text_values v on v.text_id = t.text_id where t.revision_id = ${companies.currentRevisionId} and t.path = 'name' and strpos(lower(v.value), lower(${input.query.trim()})) > 0)`,
            ),
          )
          .orderBy(asc(companies.id))
          .limit(PAGE_SIZE + 1);
        const items: PublishedCompanyIdentity[] = [];
        for (const company of rows.slice(0, PAGE_SIZE)) {
          // oxlint-disable-next-line no-await-in-loop -- Only immutable published identity fields are hydrated on one read-only snapshot.
          items.push(await companyIdentity(transaction, company));
        }
        return {
          items,
          nextId: rows.length > PAGE_SIZE ? (rows[PAGE_SIZE - 1]?.id ?? null) : null,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  public async identity(id: string): Promise<PublishedCompanyIdentity> {
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
            ),
          );
        if (!company) {
          throw new DomainError(HTTP.notFound, 'COMPANY_NOT_FOUND', 'Компания не найдена');
        }
        return await companyIdentity(transaction, company);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
export { companyIdentity, PublicCompanyDirectoryService };
