// oxlint-disable no-magic-numbers -- Rates, event registry and revision limits are explicit validated domain contracts.
import { PolicySchema } from '../states/contracts';
import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema, resolveText } from '../localized-content/contracts';

const TaxEventSchema = z.enum(['PLAYER_TRANSFER']).openapi('TaxableEventType');
const JurisdictionSchema = z.enum(['CITIZENSHIP', 'TERRITORIAL']);
const TaxpayerSchema = z.enum(['SENDER', 'RECIPIENT']);
const TaxBaseSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('FULL_AMOUNT') }).strict(),
  z
    .object({
      kind: z.literal('EXCESS'),
      thresholdMinor: z.string().regex(/^(?:0|[1-9][0-9]{0,29})$/u),
    })
    .strict(),
]);
const TaxBeneficiarySchema = z
  .object({ kind: z.enum(['TREASURY', 'CENTRAL_BANK']), ownerId: z.uuid() })
  .strict();
const TaxRuleSchema = z
  .object({
    event: TaxEventSchema,
    category: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/u),
    taxpayer: TaxpayerSchema,
    base: TaxBaseSchema.optional(),
    jurisdictions: z
      .array(JurisdictionSchema)
      .min(1)
      .max(2)
      .refine((items) => new Set(items).size === items.length, 'Duplicate jurisdiction'),
    rateBps: z.number().int().min(0).max(10_000),
    recipient: z.enum(['STATE_TREASURY', 'CENTRAL_BANK']),
    currencyIds: z
      .array(z.uuid())
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, 'Duplicate currency'),
  })
  .strict()
  .openapi('TaxRule');
const TaxIdentity = {
  name: LocalizedInputSchema.refine(
    (value) => resolveText(value, 'en').value.trim() !== '',
    'Name required',
  ),
  description: LocalizedInputSchema,
};
const TaxLawContentSchema = z
  .object({
    ...TaxIdentity,
    document: LocalizedInputSchema,
    effectiveAt: z.iso.datetime(),
    rule: TaxRuleSchema,
  })
  .strict()
  .openapi('TaxLawContent');
const TaxDirectiveSchemas = [
  z
    .object({
      kind: z.literal('ESTABLISH_TAX_OFFICE'),
      ...TaxIdentity,
      initialPolicies: z.array(PolicySchema).max(20).optional(),
    })
    .strict(),
  z.object({ kind: z.literal('CHANGE_TAX_CHARTER'), ...TaxIdentity }).strict(),
  z
    .object({ kind: z.literal('ENACT_TAX_LAW'), lawId: z.uuid(), ...TaxLawContentSchema.shape })
    .strict(),
  z
    .object({
      kind: z.literal('AMEND_TAX_LAW'),
      lawId: z.uuid(),
      baseRevisionId: z.uuid(),
      ...TaxLawContentSchema.shape,
    })
    .strict(),
  z
    .object({
      kind: z.literal('REPEAL_TAX_LAW'),
      lawId: z.uuid(),
      baseRevisionId: z.uuid(),
      effectiveAt: z.iso.datetime(),
    })
    .strict(),
] as const;
const TaxDirectiveSchema = z.discriminatedUnion('kind', TaxDirectiveSchemas);
const TaxEvidenceSchema = z
  .object({
    stateId: z.uuid(),
    basis: JurisdictionSchema,
    source: z.enum(['CITIZENSHIP', 'CITIZENSHIP_PROXY']),
    membershipJoinedAt: z.iso.datetime(),
  })
  .strict()
  .openapi('TaxJurisdictionEvidence');
const TaxClaimSchema = z
  .object({
    lawId: z.uuid(),
    revisionId: z.uuid(),
    revision: z.number().int(),
    stateId: z.uuid(),
    stateName: LocalizedInputSchema,
    stateSlug: z.string(),
    name: LocalizedInputSchema,
    category: z.string(),
    taxpayer: TaxpayerSchema.optional(),
    baseMinor: z.string().optional(),
    beneficiary: TaxBeneficiarySchema.optional(),
    rateBps: z.number().int(),
    evidence: z.array(TaxEvidenceSchema),
    nationalAmountMinor: z.string(),
  })
  .strict()
  .openapi('TaxClaim');
const TaxChargeSchema = z
  .object({
    key: z.string(),
    taxpayer: TaxpayerSchema.optional(),
    claims: z.array(TaxClaimSchema),
    treatyId: z.uuid().nullable(),
    treatyRevisionId: z.uuid().nullable(),
    treatyName: LocalizedInputSchema,
    mode: z.enum(['NATIONAL', 'EXCLUSIVE', 'SHARED']),
    rateBps: z.number().int(),
    amountMinor: z.string(),
    allocations: z.array(
      z.object({
        stateId: z.uuid(),
        shareBps: z.number().int(),
        amountMinor: z.string(),
        beneficiary: TaxBeneficiarySchema.optional(),
      }),
    ),
  })
  .strict()
  .openapi('TaxCharge');
const TaxCalculationSchema = z
  .object({
    event: TaxEventSchema,
    currencyId: z.uuid(),
    senderId: z.uuid(),
    recipientId: z.uuid(),
    principalMinor: z.string(),
    totalTaxMinor: z.string(),
    totalDebitMinor: z.string(),
    recipientCreditMinor: z.string().optional(),
    charges: z.array(TaxChargeSchema),
  })
  .strict()
  .openapi('TaxCalculation');
const TransferQuoteSchema = z
  .object({
    id: z.uuid(),
    expiresAt: z.iso.datetime(),
    calculation: TaxCalculationSchema,
  })
  .strict()
  .openapi('TransferQuote');
type TaxRule = z.infer<typeof TaxRuleSchema>;
type TaxDirective = z.infer<typeof TaxDirectiveSchema>;
type TaxEvidence = z.infer<typeof TaxEvidenceSchema>;
type TaxClaim = z.infer<typeof TaxClaimSchema>;
type TaxCharge = z.infer<typeof TaxChargeSchema>;
type TaxCalculation = z.infer<typeof TaxCalculationSchema>;
export {
  TaxEventSchema,
  TaxRuleSchema,
  TaxLawContentSchema,
  TaxIdentity,
  TaxDirectiveSchemas,
  TaxDirectiveSchema,
  TaxEvidenceSchema,
  TaxClaimSchema,
  TaxChargeSchema,
  TaxCalculationSchema,
  TransferQuoteSchema,
  type TaxRule,
  type TaxDirective,
  type TaxEvidence,
  type TaxClaim,
  type TaxCharge,
  type TaxCalculation,
};
