import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Database } from '../../db';
import type { Transaction } from '../permissions/transaction';
import {
  states,
  stateGovernanceRevisions,
  stateRevisionTexts,
  localizedTextValues,
  stateMemberships,
} from '../../db/schema';
import { directoryItems } from './directory-items';
import type { StateDirectory, StateDirectoryQuery } from './directory-contracts';

const population = sql<number>`(select count(*)::int from ${stateMemberships} where ${stateMemberships.stateId} = ${states.id} and ${stateMemberships.endedAt} is null)`;
const entryMode = sql<string>`${stateGovernanceRevisions.configuration}->'citizenship'->>'entryMode'`;
const hasConstitution = sql<boolean>`(${stateGovernanceRevisions.configuration}->'constitution' <> 'null'::jsonb)`;
function directoryFilter(query: Readonly<StateDirectoryQuery>): SQL | undefined {
  const needle = `%${query.search
    .replaceAll('\\', String.raw`\\`)
    .replaceAll('%', String.raw`\%`)
    .replaceAll('_', String.raw`\_`)}%`;
  return and(
    eq(states.status, 'ACTIVE'),
    query.entryMode === 'ALL' ? undefined : sql`${entryMode} = ${query.entryMode}`,
    query.constitution === 'ALL'
      ? undefined
      : sql`${hasConstitution} = ${query.constitution === 'YES'}`,
    query.search === ''
      ? undefined
      : sql`(${states.slug} ilike ${needle} or exists (
      select 1 from ${stateRevisionTexts} inner join ${localizedTextValues} on ${localizedTextValues.textId} = ${stateRevisionTexts.textId}
      where ${stateRevisionTexts.revisionId} = ${states.currentRevisionId}
      and ${stateRevisionTexts.path} in ('name', 'description') and ${localizedTextValues.value} ilike ${needle}
    ))`,
  );
}
function nameOrder(query: Readonly<StateDirectoryQuery>): SQL {
  return sql`lower(coalesce((select ${localizedTextValues.value} from ${stateRevisionTexts}
    inner join ${localizedTextValues} on ${localizedTextValues.textId} = ${stateRevisionTexts.textId}
    where ${stateRevisionTexts.revisionId} = ${states.currentRevisionId} and ${stateRevisionTexts.path} = 'name' and trim(${localizedTextValues.value}) <> ''
    order by case when ${localizedTextValues.locale} = ${query.locale} then 0 when ${localizedTextValues.locale} = 'en' then 1 else 2 end limit 1), ${states.slug}))`;
}
async function pageRecords(
  transaction: Transaction,
  query: Readonly<StateDirectoryQuery>,
  options: Readonly<{ filter: SQL | undefined; page: number }>,
): Promise<Parameters<typeof directoryItems>[1]> {
  let order = desc(states.createdAt);
  if (query.sort === 'NAME') {
    order = asc(nameOrder(query));
  }
  if (query.sort === 'POPULATION') {
    order = desc(population);
  }
  return await transaction
    .select({
      id: states.id,
      slug: states.slug,
      createdAt: states.createdAt,
      revisionId: stateGovernanceRevisions.id,
      configuration: stateGovernanceRevisions.configuration,
      citizens: population,
    })
    .from(states)
    .innerJoin(stateGovernanceRevisions, eq(stateGovernanceRevisions.id, states.currentRevisionId))
    .where(options.filter)
    .orderBy(order, asc(states.id))
    .limit(query.pageSize)
    .offset((options.page - 1) * query.pageSize);
}
async function listPublicStates(
  db: Database['db'],
  query: Readonly<StateDirectoryQuery>,
): Promise<StateDirectory> {
  return await db.transaction(
    async (transaction) => {
      const filter = directoryFilter(query);
      const [totals] = await transaction
        .select({ total: count() })
        .from(states)
        .innerJoin(
          stateGovernanceRevisions,
          eq(stateGovernanceRevisions.id, states.currentRevisionId),
        )
        .where(filter);
      const total = totals?.total ?? 0;
      const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
      const records = await pageRecords(transaction, query, { filter, page });
      const items = await directoryItems(transaction, records);
      return { items, total, page, pageSize: query.pageSize };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
export { listPublicStates };
