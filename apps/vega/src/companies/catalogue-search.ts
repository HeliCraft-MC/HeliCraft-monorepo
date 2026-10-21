import { z } from 'zod';
import type { Locale } from '../locales';

const MAX_PAGE = 100_000;
const MAX_SEARCH = 100;
// oxlint-disable promise/prefer-await-to-then, unicorn/prefer-top-level-await -- Zod catch normalizes malformed URL values; these are not Promise handlers.
const catalogueSearch = z.object({
  search: z.string().trim().max(MAX_SEARCH).catch(''),
  stateId: z.union([z.uuid(), z.literal('')]).catch(''),
  status: z.enum(['ALL', 'ACTIVE', 'SUSPENDED', 'CLOSED']).catch('ACTIVE'),
  sort: z.enum(['NEWEST', 'OLDEST', 'NAME']).catch('NEWEST'),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).catch(1),
});
type CatalogueSearch = z.infer<typeof catalogueSearch>;
function catalogueUrl(search: CatalogueSearch, locale: Locale, page: number): string {
  const params = new URLSearchParams({ ...search, page: String(page), lang: locale });
  return `/companies?${params.toString()}`;
}
export { catalogueSearch, catalogueUrl, type CatalogueSearch };
