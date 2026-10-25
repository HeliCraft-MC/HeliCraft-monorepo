import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import { CompanyStatusSchema, CompanyBrandingSchema } from './contracts';

const PublishedCompanyIdentitySchema = z
  .object({
    id: z.uuid(),
    registrationStateId: z.uuid(),
    registrationStateName: LocalizedInputSchema,
    status: CompanyStatusSchema,
    branding: CompanyBrandingSchema.optional(),
    registrationStateSlug: z.string().optional(),
    registrationStateColor: z.string().optional(),
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
    foundedAt: z.iso.datetime(),
  })
  .openapi('PublishedCompanyIdentity');
const PublishedCompanyDirectorySchema = z
  .object({ items: z.array(PublishedCompanyIdentitySchema), nextId: z.uuid().nullable() })
  .openapi('PublishedCompanyDirectory');
type PublishedCompanyIdentity = z.infer<typeof PublishedCompanyIdentitySchema>;
type PublishedCompanyDirectory = z.infer<typeof PublishedCompanyDirectorySchema>;
export {
  PublishedCompanyIdentitySchema,
  PublishedCompanyDirectorySchema,
  type PublishedCompanyIdentity,
  type PublishedCompanyDirectory,
};
