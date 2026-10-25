// oxlint-disable no-magic-numbers -- Corporate decisions retain the same bounded texts, allocations and ballot sizes as their domain contracts.
import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import { PositiveMinorSchema } from '../monetary/amount-contracts';
import { CompanyOfficeSchema, CompanyRevisionContentSchema, LegalOwnerSchema } from './contracts';
import { ShareIssueSchema, ShareTransferSchema, ShareOperationSchema } from './ownership-contracts';
import { BranchRegistrationSchema, BranchCloseSchema } from './branch-contracts';

const HashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const CorporatePaymentSchema = z
  .object({
    kind: z.literal('TRANSFER_FUNDS'),
    quoteId: z.uuid().optional(),
    approvedDebitMinor: PositiveMinorSchema.optional(),
    sourceBranchId: z.uuid().optional(),
    currencyId: z.uuid(),
    amountMinor: PositiveMinorSchema,
    recipient: LegalOwnerSchema,
    purpose: z.string().trim().max(1000),
  })
  .strict();
const CompanyDecisionPayloadSchema = z
  .discriminatedUnion('kind', [
    z.object({ kind: z.literal('AMEND_CHARTER'), content: CompanyRevisionContentSchema }).strict(),
    z
      .object({
        kind: z.literal('UPDATE_PROFILE'),
        branding: CompanyRevisionContentSchema.shape.branding,
        name: LocalizedInputSchema,
        description: LocalizedInputSchema,
        categories: CompanyRevisionContentSchema.shape.categories,
      })
      .strict(),
    z.object({ kind: z.literal('CREATE_OFFICE'), office: CompanyOfficeSchema }).strict(),
    z.object({ kind: z.literal('UPDATE_OFFICE'), office: CompanyOfficeSchema }).strict(),
    z
      .object({
        kind: z.literal('APPOINT_OFFICE_HOLDER'),
        officeId: z.uuid(),
        userId: z.uuid(),
        replacedUserId: z.uuid().nullable(),
      })
      .strict(),
    z
      .object({ kind: z.literal('REMOVE_OFFICE_HOLDER'), officeId: z.uuid(), userId: z.uuid() })
      .strict(),
    CorporatePaymentSchema,
    z
      .object({
        kind: z.literal('ISSUE_SHARES'),
        operation: ShareIssueSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal('AUTHORIZE_SHARE_TRANSFER'),
        operation: ShareTransferSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal('TRANSFER_OWNED_SHARES'),
        operation: ShareTransferSchema,
        authorizationDecisionId: z.uuid().nullable(),
      })
      .strict(),
    z
      .object({ kind: z.literal('FOUND_COMPANY'), companyId: z.uuid(), formationHash: HashSchema })
      .strict(),
    BranchRegistrationSchema,
    BranchCloseSchema,
    z
      .object({ kind: z.literal('CLOSE_COMPANY'), reason: z.string().trim().min(1).max(2000) })
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
      .object({ kind: z.literal('ACCEPT_SHARE_ACQUISITION'), operation: ShareOperationSchema })
      .strict(),
    z.object({ kind: z.literal('REVOKE_SHARE_ACQUISITION'), consentId: z.uuid() }).strict(),
  ])
  .openapi('CompanyDecisionPayload');
type CompanyDecisionPayload = z.infer<typeof CompanyDecisionPayloadSchema>;
const CompanyDecisionInputSchema = z
  .object({ revisionId: z.uuid(), idempotencyKey: z.uuid(), payload: CompanyDecisionPayloadSchema })
  .strict();
interface CompanyActor {
  readonly id: string;
  readonly admin: boolean;
}
type CompanyDecisionInput = z.infer<typeof CompanyDecisionInputSchema>;
export {
  HashSchema,
  CorporatePaymentSchema,
  CompanyDecisionPayloadSchema,
  CompanyDecisionInputSchema,
  type CompanyDecisionPayload,
  type CompanyActor,
  type CompanyDecisionInput,
};
