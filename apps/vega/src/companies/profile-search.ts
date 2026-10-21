import { z } from 'zod';

const MAX_PAGE = 100_000;
// oxlint-disable promise/prefer-await-to-then, unicorn/prefer-top-level-await -- Zod catches malformed public pagination rather than handling Promises.
const page = z.coerce.number().int().min(1).max(MAX_PAGE).catch(1);
const profileSearch = z.object({
  ownersPage: page,
  holdingsPage: page,
  historyPage: page,
  branchesPage: page,
});
type ProfileSearch = z.infer<typeof profileSearch>;
export { profileSearch, type ProfileSearch };
