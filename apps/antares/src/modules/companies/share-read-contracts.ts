import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import { CompanyStatusSchema, LegalOwnerSchema, ShareQuantitySchema } from './contracts';
import { ShareOperationSchema } from './ownership-contracts';

const ShareAcquisitionConsentViewSchema = z
  .object({
    id: z.uuid(),
    owner: LegalOwnerSchema,
    actorId: z.uuid(),
    companyDecisionId: z.uuid().nullable(),
    stateDirectiveId: z.uuid().nullable(),
    createdAt: z.iso.datetime(),
    revokedAt: z.iso.datetime().nullable(),
    eventId: z.uuid().nullable(),
    status: z.enum(['AVAILABLE', 'REVOKED', 'CONSUMED', 'STALE']),
  })
  .openapi('ShareAcquisitionConsentView');
const ShareOperationViewSchema = z
  .object({
    id: z.uuid(),
    operation: ShareOperationSchema,
    termsHash: z.string().regex(/^[a-f0-9]{64}$/u),
    createdBy: z.uuid(),
    createdAt: z.iso.datetime(),
    eventId: z.uuid().nullable(),
    consents: z.array(ShareAcquisitionConsentViewSchema),
    termsCurrent: z.boolean(),
    issuerApprovalRequired: z.boolean(),
    availableIssuerApprovalDecisionId: z.uuid().nullable(),
  })
  .openapi('ShareOperationView');
const SharePositionSchema = z
  .object({
    issuerId: z.uuid(),
    issuerRevisionId: z.uuid(),
    status: CompanyStatusSchema,
    name: LocalizedInputSchema,
    shares: ShareQuantitySchema,
    issuedShares: ShareQuantitySchema,
    controls: z.boolean(),
  })
  .openapi('CompanySharePosition');
const SharePortfolioSchema = z
  .object({ items: z.array(SharePositionSchema), page: z.number().int(), hasMore: z.boolean() })
  .openapi('SharePortfolio');
const ShareHistoryEntrySchema = z
  .object({
    id: z.uuid(),
    issuerId: z.uuid(),
    kind: z.enum(['INITIAL', 'ISSUE', 'TRANSFER']),
    shares: ShareQuantitySchema,
    actorId: z.uuid(),
    createdAt: z.iso.datetime(),
    applicationId: z.uuid().nullable(),
    decisionId: z.uuid().nullable(),
    stateDirectiveId: z.uuid().nullable(),
    authorizationDecisionId: z.uuid().nullable(),
    operation: z.union([ShareOperationSchema, z.null()]),
    postings: z.array(
      z.object({ owner: LegalOwnerSchema, delta: z.string().regex(/^-?[1-9][0-9]{0,29}$/u) }),
    ),
  })
  .openapi('CompanyShareHistoryEntry');
const ShareHistorySchema = z
  .object({ items: z.array(ShareHistoryEntrySchema), page: z.number().int(), hasMore: z.boolean() })
  .openapi('CompanyShareHistory');
type SharePortfolio = z.infer<typeof SharePortfolioSchema>;
type ShareOperationView = z.infer<typeof ShareOperationViewSchema>;
type ShareAcquisitionConsentView = z.infer<typeof ShareAcquisitionConsentViewSchema>;
type ShareHistory = z.infer<typeof ShareHistorySchema>;
export {
  ShareOperationViewSchema,
  SharePositionSchema,
  SharePortfolioSchema,
  ShareHistorySchema,
  type SharePortfolio,
  type ShareOperationView,
  type ShareAcquisitionConsentView,
  type ShareHistory,
};
