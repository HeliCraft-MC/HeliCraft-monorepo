// oxlint-disable no-magic-numbers -- Monetary precision, exact integer size and bounded request limits are API contracts.
import { PolicySchema } from '../states/contracts';
import { z } from '@hono/zod-openapi';
import { TaxDirectiveSchemas } from '../taxation/contracts';
import { TreatyContentSchema, TreatyDirectiveSchemas } from '../diplomacy/contracts';
import { LocalizedInputSchema, resolveText } from '../localized-content/contracts';
import { MinorSchema, CumulativeMinorSchema, PositiveMinorSchema } from './amount-contracts';
import { CompanyStateDirectiveSchemas } from '../companies/registration-contracts';
import { FxDecisionDisplaySchema, FxDirectiveSchemas } from '../fx/contracts';

const NameSchema = LocalizedInputSchema.refine(
  (value) => resolveText(value, 'en').value.trim().length > 0,
  'Name required',
);
const OptionalMinorSchema = MinorSchema.nullable().openapi('OptionalMoneyLimit');
const MonetaryPolicySchema = z
  .object({
    maxSupplyMinor: OptionalMinorSchema,
    maxGrossIssuance30dMinor: OptionalMinorSchema,
    maxIssuancePerOperationMinor: OptionalMinorSchema,
  })
  .strict()
  .openapi('MonetaryPolicy');
const RecipientSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PLAYER'), userId: z.uuid() }).strict(),
  z.object({ type: z.literal('COMPANY'), companyId: z.uuid() }).strict(),
  z.object({ type: z.literal('TREASURY') }).strict(),
  z.object({ type: z.literal('CENTRAL_BANK') }).strict(),
]);
const institution = { name: NameSchema, description: LocalizedInputSchema };
const financial = {
  currencyId: z.uuid(),
  amountMinor: PositiveMinorSchema,
  purpose: z.string().trim().max(1000),
};
const DirectivePayloadSchema = z
  .discriminatedUnion('kind', [
    ...FxDirectiveSchemas,
    ...CompanyStateDirectiveSchemas,
    ...TaxDirectiveSchemas,
    ...TreatyDirectiveSchemas,
    z
      .object({
        kind: z.literal('ESTABLISH_BANK'),
        ...institution,
        initialPolicies: z.array(PolicySchema).max(20).optional(),
      })
      .strict(),
    z.object({ kind: z.literal('CHANGE_CHARTER'), ...institution }).strict(),
    z
      .object({
        kind: z.literal('CREATE_CURRENCY'),
        code: z
          .string()
          .regex(/^[A-Z][A-Z0-9]{2,11}$/u)
          .openapi({ pattern: '^[A-Z][A-Z0-9]{2,11}$' }),
        ...institution,
      })
      .strict(),
    z
      .object({
        kind: z.literal('CHANGE_POLICY'),
        currencyId: z.uuid(),
        policy: MonetaryPolicySchema,
      })
      .strict(),
    z.object({ kind: z.literal('ISSUE'), ...financial }).strict(),
    z.object({ kind: z.literal('BURN'), ...financial }).strict(),
    z
      .object({ kind: z.literal('BANK_TRANSFER'), ...financial, recipient: RecipientSchema })
      .strict(),
    z
      .object({ kind: z.literal('TREASURY_TRANSFER'), ...financial, recipient: RecipientSchema })
      .strict(),
  ])
  .openapi('MonetaryDirectivePayload');
const DirectiveInputSchema = z
  .object({ idempotencyKey: z.uuid(), payload: DirectivePayloadSchema })
  .strict();
const WalletTransferSchema = z
  .object({
    idempotencyKey: z.uuid(),
    quoteId: z.uuid().optional(),
    currencyId: z.uuid(),
    recipientId: z.uuid(),
    recipientType: z.enum(['PLAYER', 'COMPANY']).optional(),
    amountMinor: PositiveMinorSchema,
    purpose: z.string().trim().max(1000),
  })
  .strict()
  .openapi('WalletTransfer');
const BankStatusSchema = z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']);
const DirectiveDetailSchema = z
  .object({
    id: z.uuid(),
    stateId: z.uuid(),
    governanceRevisionId: z.uuid(),
    createdBy: z.uuid(),
    payload: DirectivePayloadSchema,
    payloadHash: z.string(),
    treatyContent: TreatyContentSchema.nullable().openapi('OptionalDirectiveTreatyContent'),
    fxDisplay: FxDecisionDisplaySchema.optional(),
    status: z.enum(['PENDING', 'APPLIED', 'CANCELLED']),
    createdAt: z.iso.datetime(),
    appliedAt: z.iso.datetime().nullable(),
    stale: z.boolean(),
    ready: z.boolean(),
    manualRequired: z.boolean(),
    manualProcedure: LocalizedInputSchema,
    canApply: z.boolean(),
    executionProblem: z.string().nullable(),
    approvableOfficeIds: z.array(z.uuid()),
    approvalGroups: z.array(
      z.object({ mode: z.enum(['ANY', 'ALL']), officeIds: z.array(z.uuid()) }),
    ),
    approvals: z.array(z.object({ officeId: z.uuid(), actorId: z.uuid(), current: z.boolean() })),
    votes: z.array(z.object({ id: z.uuid(), approved: z.boolean() })),
  })
  .openapi('MonetaryDirective');
const BankSchema = z
  .object({
    id: z.uuid(),
    stateId: z.uuid(),
    status: BankStatusSchema,
    charterDirectiveId: z.uuid(),
    establishmentDirectiveId: z.uuid(),
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
    createdAt: z.iso.datetime(),
    reviews: z.array(
      z.object({
        id: z.uuid(),
        actorId: z.uuid(),
        status: BankStatusSchema,
        reason: z.string(),
        createdAt: z.iso.datetime(),
      }),
    ),
  })
  .openapi('CentralBank');
const PolicyRevisionSchema = z
  .object({
    id: z.uuid(),
    number: z.number().int().min(1),
    directiveId: z.uuid(),
    createdAt: z.iso.datetime(),
    limits: MonetaryPolicySchema,
  })
  .openapi('MonetaryPolicyRevision');
const CurrencySchema = z
  .object({
    id: z.uuid(),
    stateId: z.uuid(),
    bankId: z.uuid(),
    code: z.string(),
    precision: z.literal(2),
    status: z.enum(['ACTIVE', 'BLOCKED']),
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
    supplyMinor: MinorSchema,
    createdAt: z.iso.datetime(),
    grossIssuance30dMinor: CumulativeMinorSchema,
    availableIssuanceMinor: MinorSchema,
    remainingIssuanceMinor: MinorSchema,
    policy: PolicyRevisionSchema.nullable().openapi('OptionalMonetaryPolicyRevision'),
  })
  .openapi('NationalCurrency');
const AccountSchema = z
  .object({
    id: z.uuid(),
    currencyId: z.uuid(),
    kind: z.enum(['PLAYER', 'COMPANY', 'CENTRAL_BANK', 'TREASURY', 'ISSUANCE']),
    ownerId: z.uuid(),
    balanceMinor: z.string(),
    reservedMinor: MinorSchema.optional(),
    availableMinor: MinorSchema.optional(),
  })
  .openapi('FinancialAccount');
const LedgerTransactionSchema = z
  .object({
    id: z.uuid(),
    currencyId: z.uuid(),
    economicOperationId: z.uuid().nullable(),
    kind: z.enum(['ISSUE', 'BURN', 'TRANSFER']),
    amountMinor: PositiveMinorSchema,
    purpose: z.string(),
    actorId: z.uuid(),
    initiatorId: z.uuid(),
    directiveId: z.uuid().nullable(),
    companyDecisionId: z.uuid().nullable(),
    policyRevisionId: z.uuid().nullable(),
    createdAt: z.iso.datetime(),
    postings: z.array(
      z.object({ account: AccountSchema.omit({ balanceMinor: true }), deltaMinor: z.string() }),
    ),
  })
  .openapi('LedgerTransaction');
const StateMonetarySchema = z
  .object({
    bank: BankSchema.nullable().openapi('OptionalCentralBank'),
    currency: CurrencySchema.nullable().openapi('OptionalNationalCurrency'),
    currencies: z.array(CurrencySchema),
    accounts: z.array(AccountSchema),
    directives: z.array(DirectiveDetailSchema),
    policyHistory: z.array(PolicyRevisionSchema),
    transactions: z.array(LedgerTransactionSchema),
    page: z.number().int(),
    hasMore: z.boolean(),
  })
  .openapi('StateMonetary');
const WalletSchema = z
  .object({
    currencies: z.array(CurrencySchema),
    accounts: z.array(AccountSchema),
    transactions: z.array(LedgerTransactionSchema),
    page: z.number().int(),
    hasMore: z.boolean(),
  })
  .openapi('Wallet');
const PublicCurrencySchema = z
  .object({
    currency: CurrencySchema,
    bank: BankSchema.omit({ reviews: true }),
    state: z.object({
      id: z.uuid(),
      slug: z.string().nullable(),
      name: z.union([LocalizedInputSchema, z.null()]),
      active: z.boolean(),
    }),
    issuancePage: z.number().int(),
    hasMoreIssuance: z.boolean(),
    issuance: z.array(
      z.object({
        id: z.uuid(),
        kind: z.enum(['ISSUE', 'BURN']),
        amountMinor: MinorSchema,
        policyRevisionId: z.uuid().nullable(),
        createdAt: z.iso.datetime(),
      }),
    ),
  })
  .openapi('PublicCurrency');
type DirectivePayload = z.infer<typeof DirectivePayloadSchema>;
type DirectiveInput = z.infer<typeof DirectiveInputSchema>;
type DirectiveDetail = z.infer<typeof DirectiveDetailSchema>;
type MonetaryPolicy = z.infer<typeof MonetaryPolicySchema>;
type Bank = z.infer<typeof BankSchema>;
type Currency = z.infer<typeof CurrencySchema>;
type Account = z.infer<typeof AccountSchema>;
type LedgerTransaction = z.infer<typeof LedgerTransactionSchema>;
type WalletTransfer = z.infer<typeof WalletTransferSchema>;
type MonetaryActor = Readonly<{ id: string; admin: boolean }>;
export {
  MonetaryPolicySchema,
  PolicyRevisionSchema,
  DirectivePayloadSchema,
  DirectiveInputSchema,
  DirectiveDetailSchema,
  BankStatusSchema,
  BankSchema,
  CurrencySchema,
  AccountSchema,
  LedgerTransactionSchema,
  StateMonetarySchema,
  WalletSchema,
  WalletTransferSchema,
  PublicCurrencySchema,
  type DirectivePayload,
  type DirectiveInput,
  type DirectiveDetail,
  type MonetaryPolicy,
  type Bank,
  type Currency,
  type Account,
  type LedgerTransaction,
  type WalletTransfer,
  type MonetaryActor,
};
export { MinorSchema, CumulativeMinorSchema, PositiveMinorSchema } from './amount-contracts';
