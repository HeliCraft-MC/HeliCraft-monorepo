import { and, eq, gt, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { centralBanks, states, fxOffers, currencies } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import type { FxOfferListSchema } from './read-contracts';
import type { z } from '@hono/zod-openapi';
import { fxCurrency } from './display';
import type { FxOfferSearch } from './route-contracts';

function availableFxFilter(): SQL | undefined {
  return and(
    eq(fxOffers.status, 'ACTIVE'),
    sql`${fxOffers.remainingLots} >= (${fxOffers.terms}->>'minimumLots')::numeric`,
    gt(fxOffers.expiresAt, sql`clock_timestamp()`),
    eq(centralBanks.status, 'ACTIVE'),
    eq(states.status, 'ACTIVE'),
    sql`(select count(*) from currencies c where c.id in (${fxOffers.receiveCurrencyId},${fxOffers.provideCurrencyId}) and c.status = 'ACTIVE') = 2`,
  );
}
function fxCatalogueFilter(filters: Partial<FxOfferSearch>): SQL | undefined {
  const search = filters.search ?? '';
  const receiveCode = filters.receiveCode ?? '';
  const provideCode = filters.provideCode ?? '';
  return and(
    availableFxFilter(),
    receiveCode === ''
      ? undefined
      : sql`exists (select 1 from currencies c where c.id = ${fxOffers.receiveCurrencyId} and c.code = ${filters.receiveCode})`,
    provideCode === ''
      ? undefined
      : sql`exists (select 1 from currencies c where c.id = ${fxOffers.provideCurrencyId} and c.code = ${filters.provideCode})`,
    search === ''
      ? undefined
      : sql`(
      exists (select 1 from monetary_directives d join localized_text_values v on v.text_id = d.name_text_id
        where d.id = ${centralBanks.charterDirectiveId} and strpos(lower(v.value), lower(${search})) > 0)
      or exists (select 1 from state_revision_texts t join localized_text_values v on v.text_id = t.text_id
        where t.revision_id = ${states.currentRevisionId} and t.path = 'name' and strpos(lower(v.value), lower(${search})) > 0)
      or exists (select 1 from currencies c join monetary_directives d on d.id = c.directive_id
        left join localized_text_values v on v.text_id = d.name_text_id
        where c.id in (${fxOffers.receiveCurrencyId}, ${fxOffers.provideCurrencyId})
        and (strpos(lower(c.code), lower(${search})) > 0 or strpos(lower(v.value), lower(${search})) > 0))
    )`,
  );
}
async function catalogueCurrencies(
  transaction: Transaction,
): Promise<NonNullable<z.infer<typeof FxOfferListSchema>['currencies']>> {
  const records = await transaction
    .selectDistinct({ id: currencies.id, code: currencies.code })
    .from(fxOffers)
    .innerJoin(centralBanks, eq(centralBanks.id, fxOffers.bankId))
    .innerJoin(states, eq(states.id, fxOffers.stateId))
    .innerJoin(
      currencies,
      sql`${currencies.id} in (${fxOffers.receiveCurrencyId}, ${fxOffers.provideCurrencyId})`,
    )
    .where(availableFxFilter())
    .orderBy(currencies.code);
  const result: NonNullable<z.infer<typeof FxOfferListSchema>['currencies']> = [];
  for (const record of records) {
    // oxlint-disable-next-line no-await-in-loop -- Filter choices hydrate actual published currency names on the same read-only catalogue snapshot.
    result.push(await fxCurrency(transaction, record.id));
  }
  return result;
}
export { availableFxFilter, fxCatalogueFilter, catalogueCurrencies };
