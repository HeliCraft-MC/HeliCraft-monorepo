// oxlint-disable no-magic-numbers -- Draft versions, wizard steps and review reasons are bounded public contracts.
import { z } from '@hono/zod-openapi';
import { CompanyConfigurationSchema, CompanyRegistrationPolicySchema } from './contracts';
import { HashSchema } from './decision-contracts';
import { ShareOperationSchema, ShareTransferSchema } from './ownership-contracts';
import { BranchReviewSchema } from './branch-contracts';

const CompanyDraftSaveSchema = z
  .object({
    version: z.number().int().min(1),
    title: z.string().trim().max(200),
    step: z.number().int().min(0).max(20),
    configuration: CompanyConfigurationSchema,
  })
  .strict();
const CompanyDraftSchema = z
  .object({
    id: z.uuid(),
    companyId: z.uuid(),
    ownerId: z.uuid(),
    title: z.string(),
    version: z.number().int(),
    step: z.number().int(),
    configuration: CompanyConfigurationSchema,
    formationHash: HashSchema,
    submittedApplicationId: z.uuid().nullable(),
    updatedAt: z.iso.datetime(),
    deletedAt: z.iso.datetime().nullable(),
  })
  .openapi('CompanyDraft');
const CompanySubmitSchema = z
  .object({
    version: z.number().int().min(1),
    idempotencyKey: z.uuid(),
    formationHash: HashSchema,
    policyRevisionId: z.uuid(),
  })
  .strict();
const CompanyRegistrationReviewSchema = z
  .object({
    companyId: z.uuid(),
    version: z.number().int(),
    formationHash: HashSchema,
    policyRevisionId: z.uuid(),
    policy: CompanyRegistrationPolicySchema,
    ready: z.boolean(),
    problem: z.string().nullable(),
  })
  .openapi('CompanyRegistrationReview');
const CompanyPersonalConsentSchema = z
  .object({
    role: z.enum(['FOUNDER', 'OFFICE_HOLDER']),
    formationHash: HashSchema,
    idempotencyKey: z.uuid(),
  })
  .strict();
const CompanyPersonalConsentViewSchema = z
  .object({
    id: z.uuid(),
    role: z.enum(['FOUNDER', 'OFFICE_HOLDER']),
    formationHash: HashSchema,
    createdAt: z.iso.datetime(),
    revokedAt: z.iso.datetime().nullable(),
  })
  .openapi('CompanyPersonalFormationConsent');
const CompanyStateDirectiveSchemas = [
  BranchReviewSchema,
  z
    .object({ kind: z.literal('ACCEPT_SHARE_ACQUISITION'), operation: ShareOperationSchema })
    .strict(),
  z.object({ kind: z.literal('REVOKE_SHARE_ACQUISITION'), consentId: z.uuid() }).strict(),
  z
    .object({
      kind: z.literal('TRANSFER_COMPANY_SHARES'),
      operation: ShareTransferSchema,
      authorizationDecisionId: z.uuid().nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('VOTE_AS_SHAREHOLDER'),
      votingId: z.uuid(),
      choices: z.array(z.uuid()).max(50),
      abstain: z.boolean(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('SET_COMPANY_REGISTRATION_POLICY'),
      baseRevisionId: z.uuid().nullable(),
      policy: CompanyRegistrationPolicySchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('REVIEW_COMPANY_REGISTRATION'),
      applicationId: z.uuid(),
      formationHash: HashSchema,
      decision: z.enum(['APPROVE', 'REJECT']),
      reason: z.string().trim().min(1).max(2000),
    })
    .strict(),
  z
    .object({
      kind: z.literal('CONSENT_COMPANY_FORMATION'),
      companyId: z.uuid(),
      formationHash: HashSchema,
    })
    .strict(),
] as const;
const CompanyStateDirectiveSchema = z.discriminatedUnion('kind', CompanyStateDirectiveSchemas);
type CompanyDraft = z.infer<typeof CompanyDraftSchema>;
type CompanyDraftSave = z.infer<typeof CompanyDraftSaveSchema>;
type CompanySubmit = z.infer<typeof CompanySubmitSchema>;
type CompanyStateDirective = z.infer<typeof CompanyStateDirectiveSchema>;
type RegistrationReview = z.infer<typeof CompanyRegistrationReviewSchema>;
export {
  CompanyDraftSaveSchema,
  CompanyDraftSchema,
  CompanySubmitSchema,
  CompanyRegistrationReviewSchema,
  CompanyPersonalConsentSchema,
  CompanyPersonalConsentViewSchema,
  CompanyStateDirectiveSchemas,
  CompanyStateDirectiveSchema,
  type CompanyDraft,
  type CompanyDraftSave,
  type CompanySubmit,
  type CompanyStateDirective,
  type RegistrationReview,
};
