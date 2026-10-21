// oxlint-disable no-magic-numbers -- Bounded exact quantities, corporate offices and draft limits are domain/API contracts.
import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import { VotingRulesSchema } from '../voting/rules';
import { MinorSchema, PositiveMinorSchema } from '../monetary/amount-contracts';

const ShareQuantitySchema = z
  .string()
  .regex(/^(?:0|[1-9][0-9]{0,29})$/u)
  .openapi('CompanyShareQuantity');
const PositiveSharesSchema = ShareQuantitySchema.refine(
  (value) => value !== '0',
  'Positive shares required',
);
const LegalOwnerSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('PLAYER'), id: z.uuid() }).strict(),
    z.object({ type: z.literal('COMPANY'), id: z.uuid() }).strict(),
    z.object({ type: z.literal('STATE'), id: z.uuid() }).strict(),
  ])
  .openapi('LegalOwner');
const CompanyStatusSchema = z.enum([
  'DRAFT',
  'PENDING_REGISTRATION',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
  'CLOSED',
]);
const CompanyActionSchema = z.enum([
  'AMEND_CHARTER',
  'UPDATE_PROFILE',
  'CREATE_OFFICE',
  'UPDATE_OFFICE',
  'APPOINT_OFFICE_HOLDER',
  'REMOVE_OFFICE_HOLDER',
  'TRANSFER_FUNDS',
  'ISSUE_SHARES',
  'AUTHORIZE_SHARE_TRANSFER',
  'TRANSFER_OWNED_SHARES',
  'FOUND_COMPANY',
  'REGISTER_BRANCH',
  'CLOSE_BRANCH',
  'CLOSE_COMPANY',
  'VOTE_AS_SHAREHOLDER',
  'ACCEPT_SHARE_ACQUISITION',
  'REVOKE_SHARE_ACQUISITION',
]);
const CompanyProcedureSchema = z
  .object({
    mechanism: z.enum([
      'SINGLE_OFFICE',
      'ANY_OF_OFFICES',
      'MULTIPLE_OFFICES',
      'SHAREHOLDER_VOTE',
      'OFFICE_VOTE',
      'COMBINED',
      'MANUAL',
    ]),
    officeIds: z.array(z.uuid()).max(100),
    vote: z.union([VotingRulesSchema, z.null()]),
    manualProcedure: LocalizedInputSchema,
  })
  .strict()
  .openapi('CompanyAuthorityProcedure');
const CompanyPolicySchema = z
  .object({
    action: CompanyActionSchema,
    procedure: CompanyProcedureSchema,
    financialBands: z
      .array(
        z
          .object({
            currencyId: z.uuid(),
            upToMinor: MinorSchema,
            procedure: CompanyProcedureSchema,
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .openapi('CompanyAuthorityPolicy');
const CompanyOfficeSchema = z
  .object({
    id: z.uuid(),
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
    maxHolders: z.number().int().min(1).max(100),
    required: z.boolean(),
    termDays: z.number().int().min(1).max(36_500).nullable(),
    appointment: CompanyProcedureSchema,
    removal: CompanyProcedureSchema,
    initialHolderIds: z.array(z.uuid()).max(100),
  })
  .strict()
  .openapi('CompanyOffice');
const CompanyCharterSchema = z
  .object({
    offices: z.array(CompanyOfficeSchema).max(100),
    policies: z.array(CompanyPolicySchema).max(100),
    votingDefaults: VotingRulesSchema,
    shareTransfers: z.enum(['OWNER_CONSENT', 'CORPORATE_APPROVAL']),
  })
  .strict()
  .openapi('CompanyCharter');
const CompanyConfigurationSchema = z
  .object({
    registrationStateId: z.uuid().nullable(),
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
    categories: z.array(z.string().trim().min(1).max(80)).max(20),
    totalShares: ShareQuantitySchema,
    allocations: z
      .array(z.object({ owner: LegalOwnerSchema, shares: PositiveSharesSchema }).strict())
      .max(1000),
    charter: CompanyCharterSchema,
    document: LocalizedInputSchema,
  })
  .strict()
  .openapi('CompanyConfiguration');
const CompanyRevisionContentSchema = CompanyConfigurationSchema.pick({
  name: true,
  description: true,
  categories: true,
  charter: true,
  document: true,
}).openapi('CompanyRevisionContent');
const CompanyRegistrationPolicySchema = z
  .object({
    companyMode: z.enum(['FREE', 'APPROVAL']),
    foreignPlayerFounders: z.enum(['ALLOW', 'DENY']),
    corporateFounders: z.enum(['ALLOW', 'DOMESTIC_ONLY', 'DENY']),
    stateFounders: z.enum(['ALLOW', 'DOMESTIC_ONLY', 'DENY']),
    branchMode: z.enum(['FREE', 'APPROVAL', 'DENY']),
    foreignBranches: z.enum(['ALLOW', 'DENY']),
    registrationFee: z
      .object({ currencyId: z.uuid(), amountMinor: PositiveMinorSchema })
      .strict()
      .nullable(),
  })
  .strict()
  .openapi('CompanyRegistrationPolicy');
type LegalOwner = z.infer<typeof LegalOwnerSchema>;
type CompanyAction = z.infer<typeof CompanyActionSchema>;
type CompanyProcedure = z.infer<typeof CompanyProcedureSchema>;
type CompanyPolicy = z.infer<typeof CompanyPolicySchema>;
type CompanyOffice = z.infer<typeof CompanyOfficeSchema>;
type CompanyCharter = z.infer<typeof CompanyCharterSchema>;
type CompanyConfiguration = z.infer<typeof CompanyConfigurationSchema>;
type CompanyRegistrationPolicy = z.infer<typeof CompanyRegistrationPolicySchema>;
type CompanyRevisionContent = z.infer<typeof CompanyRevisionContentSchema>;
type CompanyStatus = z.infer<typeof CompanyStatusSchema>;
export {
  ShareQuantitySchema,
  PositiveSharesSchema,
  LegalOwnerSchema,
  CompanyStatusSchema,
  CompanyActionSchema,
  CompanyProcedureSchema,
  CompanyPolicySchema,
  CompanyOfficeSchema,
  CompanyCharterSchema,
  CompanyConfigurationSchema,
  CompanyRevisionContentSchema,
  CompanyRegistrationPolicySchema,
  type LegalOwner,
  type CompanyAction,
  type CompanyProcedure,
  type CompanyPolicy,
  type CompanyOffice,
  type CompanyCharter,
  type CompanyConfiguration,
  type CompanyRegistrationPolicy,
  type CompanyRevisionContent,
  type CompanyStatus,
};
