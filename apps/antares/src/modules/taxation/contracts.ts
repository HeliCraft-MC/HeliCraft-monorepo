// oxlint-disable no-magic-numbers -- Rates, event registry and revision limits are explicit validated domain contracts.
import { PolicySchema } from '../states/contracts';
import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema, resolveText } from '../localized-content/contracts';
import { MinorSchema } from '../monetary/amount-contracts';

const TaxEventSchema = z
  .enum([
    'PLAYER_TRANSFER',
    'PLAYER_COMPANY_TRANSFER',
    'COMPANY_PLAYER_TRANSFER',
    'COMPANY_TRANSFER',
  ])
  .openapi('TaxableEventType');
const JurisdictionSchema = z.enum([
  'CITIZENSHIP',
  'TERRITORIAL',
  'COMPANY_REGISTRATION',
  'BRANCH_REGISTRATION',
]);
const CompanyTaxRegimeSchema = z
  .object({
    companyId: z.uuid(),
    branchId: z.uuid().nullable(),
    mode: z.enum(['EXEMPT', 'REPLACE', 'ADDITIONAL']),
    targetLawId: z.uuid().nullable(),
  })
  .strict()
  .refine(
    (regime) => (regime.mode === 'ADDITIONAL') === (regime.targetLawId === null),
    'Replacement/exemption requires a target law; additional obligations have their own identity',
  )
  .openapi('CompanyTaxRegime');
const TaxpayerSchema = z.enum(['SENDER', 'RECIPIENT']);
const TaxBaseSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('FULL_AMOUNT') }).strict(),
  z
    .object({
      kind: z.literal('EXCESS'),
      thresholdMinor: MinorSchema,
    })
    .strict(),
]);
const TaxBeneficiarySchema = z
  .object({ kind: z.enum(['TREASURY', 'CENTRAL_BANK']), ownerId: z.uuid() })
  .strict();
const TaxRuleSchema = z
  .object({
    event: TaxEventSchema,
    events: z
      .array(TaxEventSchema)
      .min(1)
      .max(4)
      .refine((events) => new Set(events).size === events.length, 'Duplicate event')
      .optional(),
    regime: CompanyTaxRegimeSchema.optional(),
    category: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/u),
    taxpayer: TaxpayerSchema,
    base: TaxBaseSchema.optional(),
    jurisdictions: z
      .array(JurisdictionSchema)
      .min(1)
      .max(4)
      .refine((items) => new Set(items).size === items.length, 'Duplicate jurisdiction'),
    rateBps: z.number().int().min(0).max(10_000),
    recipient: z.enum(['STATE_TREASURY', 'CENTRAL_BANK']),
    currencyIds: z
      .array(z.uuid())
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, 'Duplicate currency'),
  })
  .strict()
  .refine(
    (rule) => rule.events === undefined || rule.events.includes(rule.event),
    'The primary event must be included in the selected events',
  )
  .refine(
    (rule) => rule.regime?.mode !== 'EXEMPT' || rule.rateBps === 0,
    'An exemption requires an explicit zero rate',
  )
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
  .discriminatedUnion('source', [
    z
      .object({
        stateId: z.uuid(),
        basis: z.enum(['CITIZENSHIP', 'TERRITORIAL']),
        source: z.enum(['CITIZENSHIP', 'CITIZENSHIP_PROXY']),
        membershipJoinedAt: z.iso.datetime(),
      })
      .strict(),
    z
      .object({
        stateId: z.uuid(),
        basis: z.literal('COMPANY_REGISTRATION'),
        source: z.literal('COMPANY_REGISTRATION'),
        companyId: z.uuid(),
        registeredAt: z.iso.datetime(),
      })
      .strict(),
    z
      .object({
        stateId: z.uuid(),
        basis: z.literal('BRANCH_REGISTRATION'),
        source: z.literal('APPROVED_CORPORATE_BRANCH_CONTEXT'),
        companyId: z.uuid(),
        branchId: z.uuid(),
        applicationId: z.uuid(),
      })
      .strict(),
  ])
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
    regime: z
      .object({
        lawId: z.uuid(),
        revisionId: z.uuid(),
        mode: z.enum(['EXEMPT', 'REPLACE', 'ADDITIONAL']),
      })
      .strict()
      .optional(),
  })
  .strict()
  .openapi('TaxClaim');
const TaxChargeSchema = z
  .object({
    key: z.string(),
    taxpayer: TaxpayerSchema.optional(),
    baseMinor: z.string().optional(),
    exempt: z.boolean().optional(),
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
        accrual: z
          .object({
            key: z.string(),
            denominator: z.literal('100000000'),
            exactNumerator: z.string(),
            remainderBefore: z.string(),
            remainderAfter: z.string(),
          })
          .strict()
          .optional(),
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
    senderKind: z.enum(['PLAYER', 'COMPANY']).optional(),
    recipientKind: z.enum(['PLAYER', 'COMPANY']).optional(),
    sourceBranchId: z.uuid().optional(),
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
type TaxEvent = z.infer<typeof TaxEventSchema>;
export {
  TaxEventSchema,
  CompanyTaxRegimeSchema,
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
  type TaxEvent,
};
