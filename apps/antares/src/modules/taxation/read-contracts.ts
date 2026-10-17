import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import {
  BankSchema,
  AccountSchema,
  DirectiveDetailSchema,
  CurrencySchema,
} from '../monetary/contracts';
import { TaxRuleSchema, TaxCalculationSchema } from './contracts';

const TaxOfficeSchema = BankSchema.openapi('TaxOffice');
const LawRevisionSchema = z
  .object({
    id: z.uuid(),
    lawId: z.uuid(),
    stateId: z.uuid(),
    directiveId: z.uuid(),
    number: z.number().int(),
    status: z.enum(['ACTIVE', 'REPEALED']),
    rule: TaxRuleSchema,
    name: LocalizedInputSchema,
    description: LocalizedInputSchema,
    document: LocalizedInputSchema,
    effectiveAt: z.iso.datetime(),
    createdAt: z.iso.datetime(),
  })
  .openapi('TaxLawRevision');
const PublicLawRevisionSchema = LawRevisionSchema.omit({ document: true })
  .extend({ documentHtml: z.string() })
  .openapi('PublicTaxLawRevision');
const EconomicOperationSchema = z
  .object({
    id: z.uuid(),
    createdAt: z.iso.datetime(),
    calculation: TaxCalculationSchema,
    journals: z.array(
      z.object({
        id: z.uuid(),
        assessmentId: z.uuid().nullable(),
        creditorStateId: z.uuid().nullable(),
      }),
    ),
  })
  .openapi('EconomicOperation');
const TaxAssessmentViewSchema = z
  .object({
    id: z.uuid(),
    operationId: z.uuid(),
    currencyId: z.uuid(),
    baseMinor: z.string(),
    amountMinor: z.string(),
    mode: z.enum(['NATIONAL', 'EXCLUSIVE', 'SHARED']),
    laws: z.array(
      z.object({
        lawId: z.uuid(),
        revisionId: z.uuid(),
        number: z.number().int(),
        name: LocalizedInputSchema,
      }),
    ),
    treatyId: z.uuid().nullable(),
    treatyRevisionId: z.uuid().nullable(),
    treatyName: LocalizedInputSchema,
    createdAt: z.iso.datetime(),
  })
  .openapi('TaxAssessmentView');
const StateTaxationSchema = z
  .object({
    office: TaxOfficeSchema.nullable().openapi('OptionalTaxOffice'),
    laws: z.array(LawRevisionSchema),
    directives: z.array(DirectiveDetailSchema),
    accounts: z.array(AccountSchema),
    currencies: z.array(CurrencySchema),
    assessments: z.array(TaxAssessmentViewSchema),
    receipts: z.array(
      z.object({
        assessmentId: z.uuid(),
        operationId: z.uuid(),
        journalId: z.uuid(),
        amountMinor: z.string(),
        currencyId: z.uuid(),
        createdAt: z.iso.datetime(),
        laws: z.array(
          z.object({
            lawId: z.uuid(),
            revisionId: z.uuid(),
            number: z.number().int(),
            name: LocalizedInputSchema,
          }),
        ),
        treatyId: z.uuid().nullable(),
        treatyRevisionId: z.uuid().nullable(),
        treatyName: LocalizedInputSchema,
      }),
    ),
    totals: z.array(z.object({ currencyId: z.uuid(), amountMinor: z.string() })),
    page: z.number().int(),
    hasMore: z.boolean(),
  })
  .openapi('StateTaxation');
const PublicTaxationSchema = z
  .object({
    office: TaxOfficeSchema.omit({ reviews: true }),
    laws: z.array(PublicLawRevisionSchema),
  })
  .openapi('PublicTaxation');
export {
  TaxAssessmentViewSchema,
  TaxOfficeSchema,
  LawRevisionSchema,
  PublicLawRevisionSchema,
  EconomicOperationSchema,
  StateTaxationSchema,
  PublicTaxationSchema,
};
