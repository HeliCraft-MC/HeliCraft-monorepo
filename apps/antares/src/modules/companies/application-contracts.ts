import { z } from '@hono/zod-openapi';
import { CompanyConfigurationSchema, CompanyStatusSchema } from './contracts';
import { HashSchema } from './decision-contracts';

const CompanyApplicationSchema = z
  .object({
    id: z.uuid(),
    companyId: z.uuid(),
    draftId: z.uuid(),
    applicantId: z.uuid(),
    stateId: z.uuid(),
    formationHash: HashSchema,
    policyRevisionId: z.uuid(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
    companyStatus: CompanyStatusSchema,
    reviewDirectiveId: z.uuid().nullable(),
    reviewedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    reason: z.string().nullable(),
    configuration: CompanyConfigurationSchema,
  })
  .openapi('CompanyRegistrationApplication');
const CompanyApplicationsSchema = z
  .object({
    items: z.array(CompanyApplicationSchema),
    page: z.number().int(),
    hasMore: z.boolean(),
  })
  .openapi('CompanyRegistrationApplications');
type CompanyApplication = z.infer<typeof CompanyApplicationSchema>;
export { CompanyApplicationSchema, CompanyApplicationsSchema, type CompanyApplication };
