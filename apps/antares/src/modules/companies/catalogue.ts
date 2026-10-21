import { and, asc, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Database } from '../../db';
import { companies, states } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { SUPPORTED_LOCALES } from '../localized-content/contracts';
import { readRevision } from '../states/revisions';
import { companyIdentity } from './public-directory';
import { PAGE_SIZE } from './catalogue-contracts';
import type { CompanyCatalogue, CompanyCatalogueQuery } from './catalogue-contracts';

function publishedCompanyFilter(): SQL | undefined {
  return and(
    isNotNull(companies.foundedAt),
    isNotNull(companies.currentRevisionId),
    inArray(companies.status, ['ACTIVE', 'SUSPENDED', 'CLOSED']),
  );
}
function catalogueFilter(query: CompanyCatalogueQuery): SQL | undefined {
  return and(
    publishedCompanyFilter(),
    query.stateId === '' ? undefined : eq(companies.registrationStateId, query.stateId),
    query.status === 'ALL' ? undefined : eq(companies.status, query.status),
    query.search === ''
      ? undefined
      : sql`exists (select 1 from company_revision_texts t join localized_text_values v on v.text_id = t.text_id
          where t.revision_id = ${companies.currentRevisionId} and t.path in ('name','description')
          and strpos(lower(v.value), lower(${query.search})) > 0)`,
  );
}
function catalogueOrder(query: CompanyCatalogueQuery): SQL {
  if (query.sort === 'NAME') {
    const locales = sql.join(
      SUPPORTED_LOCALES.map((locale) => sql`${locale}`),
      sql`, `,
    );
    return asc(sql`lower(coalesce((select v.value from company_revision_texts t
      join localized_text_values v on v.text_id = t.text_id
      where t.revision_id = ${companies.currentRevisionId} and t.path = 'name' and trim(v.value) <> ''
      order by case when v.locale = ${query.locale} then 0 when v.locale = 'en' then 1
        else 2 + array_position(array[${locales}]::text[], v.locale) end limit 1), ${companies.id}::text))`);
  }
  return query.sort === 'OLDEST' ? asc(companies.foundedAt) : desc(companies.foundedAt);
}
async function catalogueJurisdictions(
  transaction: Transaction,
): Promise<CompanyCatalogue['jurisdictions']> {
  const rows = await transaction
    .selectDistinct({ id: states.id, revisionId: states.currentRevisionId })
    .from(companies)
    .innerJoin(states, eq(states.id, companies.registrationStateId))
    .where(publishedCompanyFilter())
    .orderBy(asc(states.id));
  const result: CompanyCatalogue['jurisdictions'] = [];
  for (const row of rows) {
    if (row.revisionId !== null) {
      // oxlint-disable-next-line no-await-in-loop -- Jurisdiction labels hydrate from immutable published revisions on one read-only snapshot.
      const revision = await readRevision(transaction, row.revisionId);
      result.push({ id: row.id, name: revision.configuration.name });
    }
  }
  return result;
}
async function listCompanyCatalogue(
  db: Database['db'],
  query: CompanyCatalogueQuery,
): Promise<CompanyCatalogue> {
  return await db.transaction(
    async (transaction) => {
      const filter = catalogueFilter(query);
      const [totals] = await transaction.select({ total: count() }).from(companies).where(filter);
      const total = totals?.total ?? 0;
      const page = Math.min(query.page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
      const records = await transaction
        .select()
        .from(companies)
        .where(filter)
        .orderBy(catalogueOrder(query), asc(companies.id))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE);
      const items: CompanyCatalogue['items'] = [];
      for (const record of records) {
        // oxlint-disable-next-line no-await-in-loop -- Public company identities hydrate sequentially on the same consistent snapshot.
        items.push(await companyIdentity(transaction, record));
      }
      return {
        items,
        total,
        page,
        pageSize: PAGE_SIZE,
        jurisdictions: await catalogueJurisdictions(transaction),
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
export { listCompanyCatalogue };
