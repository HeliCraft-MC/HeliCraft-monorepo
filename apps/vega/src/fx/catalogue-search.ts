import { z } from 'zod';

const MAX_PAGE = 100_000;
const MAX_SEARCH = 100;
// oxlint-disable promise/prefer-await-to-then, unicorn/prefer-top-level-await -- URL parsing normalizes malformed filters through Zod defaults rather than handling Promises.
const fxSearch = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).catch(1),
  search: z.string().trim().max(MAX_SEARCH).catch(''),
  receiveCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(?:[A-Z][A-Z0-9]{1,11})?$/u)
    .catch(''),
  provideCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(?:[A-Z][A-Z0-9]{1,11})?$/u)
    .catch(''),
});
type FxSearch = z.infer<typeof fxSearch>;
export { fxSearch, type FxSearch };
