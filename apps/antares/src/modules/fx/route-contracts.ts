import { z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';

const MAX_PAGE = 100_000;
const Id = z.object({ id: z.uuid() });
const Page = z.object({ page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1) });
const MAX_SEARCH = 100;
const CurrencyCodeFilter = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^(?:[A-Z][A-Z0-9]{1,11})?$/u)
  .default('');
const FxOfferSearchSchema = Page.extend({
  search: z.string().trim().max(MAX_SEARCH).default(''),
  receiveCode: CurrencyCodeFilter,
  provideCode: CurrencyCodeFilter,
});
type FxOfferSearch = z.infer<typeof FxOfferSearchSchema>;
const Success = z.object({ success: z.literal(true) });
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  429: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
function fxDatabase(db: Database['db'] | undefined): Database['db'] {
  if (!db) {
    throw new DomainError(HTTP.unavailable, 'FX_UNAVAILABLE', 'Валютный обмен временно недоступен');
  }
  return db;
}
export { Id, Page, FxOfferSearchSchema, Success, Errors, fxDatabase, type FxOfferSearch };
