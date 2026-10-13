import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema, LocaleSchema } from '../localized-content/contracts';
import { HorizontalFlagSchema, StateConfigurationSchema } from './contracts';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE = 100_000;
const MAX_PAGE_SIZE = 48;
const SEARCH_LENGTH = 200;
const StateDirectoryQuerySchema = z.object({
  search: z.string().trim().max(SEARCH_LENGTH).default(''),
  entryMode: z.enum(['ALL', 'OPEN', 'BY_APPLICATION', 'BY_INVITATION']).default('ALL'),
  constitution: z.enum(['ALL', 'YES', 'NO']).default('ALL'),
  sort: z.enum(['NEWEST', 'NAME', 'POPULATION']).default('NEWEST'),
  locale: LocaleSchema.default('ru'),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
const PublicStateSummarySchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
    color: z.string(),
    horizontalFlag: HorizontalFlagSchema,
    citizenship: StateConfigurationSchema.shape.citizenship,
    citizens: z.number().int().nonnegative(),
    officeCount: z.number().int().nonnegative(),
    hasConstitution: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .openapi('PublicStateSummary');
const StateDirectorySchema = z
  .object({
    items: z.array(PublicStateSummarySchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  })
  .openapi('StateDirectory');
type StateDirectoryQuery = z.infer<typeof StateDirectoryQuerySchema>;
type StateDirectory = z.infer<typeof StateDirectorySchema>;
export {
  StateDirectoryQuerySchema,
  StateDirectorySchema,
  type StateDirectoryQuery,
  type StateDirectory,
};
