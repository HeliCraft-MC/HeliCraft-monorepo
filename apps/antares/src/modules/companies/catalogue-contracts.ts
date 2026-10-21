import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema, LocaleSchema } from '../localized-content/contracts';
import { PublishedCompanyIdentitySchema } from './public-contracts';

const PAGE_SIZE = 12;
const MAX_PAGE = 100_000;
const MAX_SEARCH = 100;
const CompanyCatalogueQuerySchema = z.object({
  search: z.string().trim().max(MAX_SEARCH).default(''),
  stateId: z.union([z.uuid(), z.literal('')]).default(''),
  status: z.enum(['ALL', 'ACTIVE', 'SUSPENDED', 'CLOSED']).default('ACTIVE'),
  sort: z.enum(['NEWEST', 'OLDEST', 'NAME']).default('NEWEST'),
  locale: LocaleSchema.default('ru'),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
});
const CompanyCatalogueSchema = z
  .object({
    items: z.array(PublishedCompanyIdentitySchema),
    jurisdictions: z.array(z.object({ id: z.uuid(), name: LocalizedInputSchema })),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  })
  .openapi('CompanyCatalogue');
type CompanyCatalogueQuery = z.infer<typeof CompanyCatalogueQuerySchema>;
type CompanyCatalogue = z.infer<typeof CompanyCatalogueSchema>;
export {
  PAGE_SIZE,
  CompanyCatalogueQuerySchema,
  CompanyCatalogueSchema,
  type CompanyCatalogueQuery,
  type CompanyCatalogue,
};
