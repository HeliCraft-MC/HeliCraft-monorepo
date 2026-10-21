// oxlint-disable no-magic-numbers -- Exact share lots, allocations and request identifiers are bounded ownership API contracts.
import { z } from '@hono/zod-openapi';
import { LegalOwnerSchema, PositiveSharesSchema } from './contracts';

const ShareAllocationSchema = z
  .object({ owner: LegalOwnerSchema, shares: PositiveSharesSchema })
  .strict();
const ShareIssueSchema = z
  .object({
    kind: z.literal('ISSUE'),
    operationId: z.uuid(),
    issuerId: z.uuid(),
    issuerRevisionId: z.uuid(),
    shares: PositiveSharesSchema,
    allocations: z.array(ShareAllocationSchema).min(1).max(1000),
  })
  .strict()
  .openapi('CompanyShareIssue');
const ShareTransferSchema = z
  .object({
    kind: z.literal('TRANSFER'),
    operationId: z.uuid(),
    issuerId: z.uuid(),
    issuerRevisionId: z.uuid(),
    owner: LegalOwnerSchema,
    recipient: LegalOwnerSchema,
    shares: PositiveSharesSchema,
  })
  .strict()
  .openapi('CompanyShareTransfer');
const ShareOperationSchema = z
  .discriminatedUnion('kind', [ShareIssueSchema, ShareTransferSchema])
  .openapi('CompanyShareOperation');
const ShareOperationInputSchema = z
  .object({ idempotencyKey: z.uuid(), operation: ShareOperationSchema })
  .strict();
const ShareConsentInputSchema = z
  .object({
    operationId: z.uuid(),
    termsHash: z.string().regex(/^[a-f0-9]{64}$/u),
    idempotencyKey: z.uuid(),
  })
  .strict();
const PersonalShareTransferSchema = z
  .object({
    operation: ShareTransferSchema,
    authorizationDecisionId: z.uuid().nullable(),
    idempotencyKey: z.uuid(),
  })
  .strict();
type ShareOperation = z.infer<typeof ShareOperationSchema>;
type ShareTransfer = z.infer<typeof ShareTransferSchema>;
type ShareIssue = z.infer<typeof ShareIssueSchema>;
type ShareOperationInput = z.infer<typeof ShareOperationInputSchema>;
type ShareConsentInput = z.infer<typeof ShareConsentInputSchema>;
type PersonalShareTransfer = z.infer<typeof PersonalShareTransferSchema>;
export {
  ShareAllocationSchema,
  ShareIssueSchema,
  ShareTransferSchema,
  ShareOperationSchema,
  ShareOperationInputSchema,
  ShareConsentInputSchema,
  PersonalShareTransferSchema,
  type ShareOperation,
  type ShareTransfer,
  type ShareIssue,
  type ShareOperationInput,
  type ShareConsentInput,
  type PersonalShareTransfer,
};
