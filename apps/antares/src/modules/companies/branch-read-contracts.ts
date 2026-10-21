import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import { CompanyRegistrationPolicySchema } from './contracts';
import { BranchStatusSchema, BranchApplicationStatusSchema } from './branch-contracts';

const PublishedRegistrationPolicySchema = z
  .object({
    id: z.uuid(),
    stateId: z.uuid(),
    number: z.number().int(),
    directiveId: z.uuid(),
    createdAt: z.iso.datetime(),
    policy: CompanyRegistrationPolicySchema,
  })
  .openapi('PublishedCompanyRegistrationPolicy');
const BranchSummarySchema = z
  .object({
    id: z.uuid(),
    companyId: z.uuid(),
    stateId: z.uuid(),
    status: BranchStatusSchema,
    currentApplicationId: z.uuid(),
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
    createdAt: z.iso.datetime(),
  })
  .openapi('CompanyBranchSummary');
const BranchListSchema = z
  .object({ items: z.array(BranchSummarySchema), page: z.number().int(), hasMore: z.boolean() })
  .openapi('CompanyBranchList');
const PublishedBranchSchema = BranchSummarySchema.omit({ currentApplicationId: true })
  .extend({ status: z.enum(['ACTIVE', 'CLOSED']), stateName: LocalizedInputSchema })
  .openapi('PublishedCompanyBranch');
const PublishedBranchListSchema = z
  .object({ items: z.array(PublishedBranchSchema), page: z.number().int(), hasMore: z.boolean() })
  .openapi('PublishedCompanyBranchList');
const BranchApplicationViewSchema = z
  .object({
    id: z.uuid(),
    branchId: z.uuid(),
    policyRevisionId: z.uuid(),
    companyRevisionId: z.uuid(),
    status: BranchApplicationStatusSchema,
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
    createdBy: z.uuid(),
    createdAt: z.iso.datetime(),
    reviewDirectiveId: z.uuid().nullable(),
    completionDecisionId: z.uuid().nullable(),
    reviewedBy: z.uuid().nullable(),
    reviewReason: z.string().nullable(),
    reviewedAt: z.iso.datetime().nullable(),
  })
  .openapi('CompanyBranchApplication');
const BranchHistorySchema = z
  .object({
    items: z.array(
      z.object({
        id: z.uuid(),
        applicationId: z.uuid(),
        fromStatus: BranchStatusSchema.nullable(),
        toStatus: BranchStatusSchema,
        actorId: z.uuid(),
        companyDecisionId: z.uuid().nullable(),
        stateDirectiveId: z.uuid().nullable(),
        reason: z.string().nullable(),
        createdAt: z.iso.datetime(),
      }),
    ),
    page: z.number().int(),
    hasMore: z.boolean(),
  })
  .openapi('CompanyBranchHistory');
const BranchDetailSchema = z
  .object({
    branch: BranchSummarySchema,
    application: BranchApplicationViewSchema,
    history: BranchHistorySchema,
  })
  .openapi('CompanyBranchDetail');
type BranchSummary = z.infer<typeof BranchSummarySchema>;
type BranchList = z.infer<typeof BranchListSchema>;
type PublishedBranchList = z.infer<typeof PublishedBranchListSchema>;
type BranchApplicationView = z.infer<typeof BranchApplicationViewSchema>;
type BranchDetail = z.infer<typeof BranchDetailSchema>;
type BranchHistory = z.infer<typeof BranchHistorySchema>;
type PublishedRegistrationPolicy = z.infer<typeof PublishedRegistrationPolicySchema>;
export {
  PublishedBranchSchema,
  PublishedRegistrationPolicySchema,
  BranchListSchema,
  PublishedBranchListSchema,
  BranchApplicationViewSchema,
  BranchDetailSchema,
  type BranchSummary,
  type BranchList,
  type PublishedBranchList,
  type BranchApplicationView,
  type BranchDetail,
  type BranchHistory,
  type PublishedRegistrationPolicy,
};
