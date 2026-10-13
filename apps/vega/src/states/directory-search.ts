import { z } from 'zod';

const MAX_PAGE = 100_000;
const SEARCH_LENGTH = 200;
// oxlint-disable promise/prefer-await-to-then, unicorn/prefer-top-level-await -- Zod catch provides safe URL defaults, not Promise handlers.
const directorySearch = z.object({
  search: z.string().trim().max(SEARCH_LENGTH).catch(''),
  entryMode: z.enum(['ALL', 'OPEN', 'BY_APPLICATION', 'BY_INVITATION']).catch('ALL'),
  constitution: z.enum(['ALL', 'YES', 'NO']).catch('ALL'),
  sort: z.enum(['NEWEST', 'NAME', 'POPULATION']).catch('NEWEST'),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).catch(1),
});
type DirectorySearch = z.infer<typeof directorySearch>;
function directoryUrl(search: Readonly<DirectorySearch>, locale: string, page: number): string {
  const query = new URLSearchParams({ ...search, page: String(page), lang: locale });
  return `/states?${query.toString()}`;
}
export { directorySearch, directoryUrl, type DirectorySearch };
