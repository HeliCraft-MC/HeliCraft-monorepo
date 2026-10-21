import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import { CompanyCharterSchema, LegalOwnerSchema, ShareQuantitySchema } from './contracts';
import { PublishedCompanyIdentitySchema } from './public-contracts';

const PublicLegalIdentitySchema = z.object({
  owner: LegalOwnerSchema,
  name: LocalizedInputSchema,
  href: z.string().nullable(),
});
const CompanyProfileQuerySchema = z.object({
  locale: z.enum(['ru', 'en']).default('en'),
  ownersPage: z.coerce.number().int().min(1).default(1),
  holdingsPage: z.coerce.number().int().min(1).default(1),
  historyPage: z.coerce.number().int().min(1).default(1),
});
const PublishedCompanyProfileSchema = z
  .object({
    identity: PublishedCompanyIdentitySchema,
    revisionId: z.uuid(),
    revision: z.number().int().positive(),
    categories: z.array(z.string()),
    charter: CompanyCharterSchema,
    documentHtml: z.string(),
    issuedShares: ShareQuantitySchema,
    holders: z.array(
      z.object({
        officeId: z.uuid(),
        player: PublicLegalIdentitySchema,
        since: z.iso.datetime(),
      }),
    ),
    owners: z.object({
      page: z.number().int(),
      hasMore: z.boolean(),
      items: z.array(
        z.object({ identity: PublicLegalIdentitySchema, shares: ShareQuantitySchema }),
      ),
    }),
    holdings: z.object({
      page: z.number().int(),
      hasMore: z.boolean(),
      items: z.array(
        z.object({
          identity: PublicLegalIdentitySchema,
          shares: ShareQuantitySchema,
          issuedShares: ShareQuantitySchema,
          controls: z.boolean(),
        }),
      ),
    }),
    history: z.object({
      page: z.number().int(),
      hasMore: z.boolean(),
      items: z.array(z.object({ id: z.uuid(), kind: z.string(), appliedAt: z.iso.datetime() })),
    }),
  })
  .openapi('PublishedCompanyProfile');
type PublicLegalIdentity = z.infer<typeof PublicLegalIdentitySchema>;
type PublishedCompanyProfile = z.infer<typeof PublishedCompanyProfileSchema>;
type CompanyProfileQuery = z.infer<typeof CompanyProfileQuerySchema>;
export {
  CompanyProfileQuerySchema,
  PublishedCompanyProfileSchema,
  type PublicLegalIdentity,
  type PublishedCompanyProfile,
  type CompanyProfileQuery,
};
