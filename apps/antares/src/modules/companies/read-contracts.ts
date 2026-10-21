import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import {
  CompanyActionSchema,
  CompanyCharterSchema,
  CompanyStatusSchema,
  CompanyRevisionContentSchema,
  ShareQuantitySchema,
  LegalOwnerSchema,
} from './contracts';
import { CompanyDecisionPayloadSchema, HashSchema } from './decision-contracts';
import { TaxCalculationSchema } from '../taxation/contracts';

const CompanyDecisionSummarySchema = z
  .object({
    id: z.uuid(),
    companyId: z.uuid(),
    revisionId: z.uuid(),
    kind: CompanyActionSchema,
    payloadHash: HashSchema,
    status: z.enum(['PENDING', 'APPLIED', 'CANCELLED']),
    createdBy: z.uuid(),
    createdAt: z.iso.datetime(),
    appliedAt: z.iso.datetime().nullable(),
  })
  .openapi('CompanyDecisionSummary');
const CompanyDecisionDetailSchema = CompanyDecisionSummarySchema.extend({
  payload: CompanyDecisionPayloadSchema,
  calculation: TaxCalculationSchema.optional(),
  charter: CompanyCharterSchema,
  appliedBy: z.uuid().nullable(),
  manualReason: z.string().nullable(),
  stale: z.boolean(),
  ready: z.boolean(),
  canApply: z.boolean(),
  canCancel: z.boolean(),
  manualRequired: z.boolean(),
  manualProcedures: z.array(LocalizedInputSchema),
  executionProblem: z.string().nullable(),
  approvableOfficeIds: z.array(z.uuid()),
  approvalGroups: z.array(z.object({ mode: z.enum(['ANY', 'ALL']), officeIds: z.array(z.uuid()) })),
  approvals: z.array(
    z.object({
      id: z.uuid(),
      officeId: z.uuid(),
      actorId: z.uuid(),
      holderId: z.uuid(),
      current: z.boolean(),
      approvedAt: z.iso.datetime(),
      revokedAt: z.iso.datetime().nullable(),
    }),
  ),
  votes: z.array(z.object({ id: z.uuid(), requirementHash: HashSchema, approved: z.boolean() })),
}).openapi('CompanyDecisionDetail');
const CompanyWorkspaceSchema = z
  .object({
    id: z.uuid(),
    status: CompanyStatusSchema,
    registrationStateId: z.uuid(),
    currentRevisionId: z.uuid(),
    issuedShares: ShareQuantitySchema,
    availableActions: z.array(CompanyActionSchema),
    canReadFinance: z.boolean(),
    content: CompanyRevisionContentSchema,
    holders: z.array(
      z.object({ id: z.uuid(), officeId: z.uuid(), userId: z.uuid(), since: z.iso.datetime() }),
    ),
    shareholders: z.array(z.object({ owner: LegalOwnerSchema, shares: ShareQuantitySchema })),
  })
  .openapi('CompanyWorkspace');
type CompanyDecisionDetail = z.infer<typeof CompanyDecisionDetailSchema>;
type CompanyDecisionSummary = z.infer<typeof CompanyDecisionSummarySchema>;
type CompanyWorkspace = z.infer<typeof CompanyWorkspaceSchema>;
export {
  CompanyDecisionSummarySchema,
  CompanyDecisionDetailSchema,
  CompanyWorkspaceSchema,
  type CompanyDecisionSummary,
  type CompanyDecisionDetail,
  type CompanyWorkspace,
};
