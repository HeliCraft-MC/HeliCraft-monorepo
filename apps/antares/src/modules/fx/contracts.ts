import { z } from '@hono/zod-openapi';
import { PositiveMinorSchema } from '../monetary/amount-contracts';
import { LocalizedInputSchema } from '../localized-content/contracts';

const FxDecisionDisplaySchema = z
  .object({
    currencies: z.array(z.object({ id: z.uuid(), code: z.string(), name: LocalizedInputSchema })),
    banks: z.array(
      z.object({
        id: z.uuid(),
        stateId: z.uuid(),
        name: LocalizedInputSchema,
        stateName: LocalizedInputSchema,
      }),
    ),
  })
  .openapi('FxDecisionDisplay');

const FxOfferTermsSchema = z
  .object({
    receiveCurrencyId: z.uuid(),
    provideCurrencyId: z.uuid(),
    receivePerLotMinor: PositiveMinorSchema,
    providePerLotMinor: PositiveMinorSchema,
    totalLots: PositiveMinorSchema,
    minimumLots: PositiveMinorSchema,
    expiresAt: z.iso.datetime(),
  })
  .strict()
  .openapi('FxOfferTerms');
const InterbankLegSchema = z
  .object({
    stateId: z.uuid(),
    bankId: z.uuid(),
    currencyId: z.uuid(),
    amountMinor: PositiveMinorSchema,
  })
  .strict();
const InterbankTermsSchema = z
  .object({
    first: InterbankLegSchema,
    second: InterbankLegSchema,
    expiresAt: z.iso.datetime(),
  })
  .strict()
  .openapi('InterbankExchangeTerms');
const FxDirectiveSchemas = [
  z
    .object({ kind: z.literal('PUBLISH_FX_OFFER'), offerId: z.uuid(), terms: FxOfferTermsSchema })
    .strict(),
  z
    .object({
      kind: z.literal('CANCEL_FX_OFFER'),
      offerId: z.uuid(),
      termsHash: z.string().regex(/^[a-f0-9]{64}$/u),
    })
    .strict(),
  z
    .object({
      kind: z.literal('APPROVE_INTERBANK_EXCHANGE'),
      tradeId: z.uuid(),
      terms: InterbankTermsSchema,
    })
    .strict(),
] as const;
const FxDirectiveSchema = z.discriminatedUnion('kind', FxDirectiveSchemas);
const FxQuoteInputSchema = z.object({ lots: PositiveMinorSchema }).strict();
const FxFillInputSchema = z.object({ quoteId: z.uuid(), idempotencyKey: z.uuid() }).strict();
type FxOfferTerms = z.infer<typeof FxOfferTermsSchema>;
type InterbankTerms = z.infer<typeof InterbankTermsSchema>;
type FxDirective = z.infer<typeof FxDirectiveSchema>;
type FxFillInput = z.infer<typeof FxFillInputSchema>;
export {
  FxDecisionDisplaySchema,
  FxOfferTermsSchema,
  InterbankTermsSchema,
  FxDirectiveSchemas,
  FxDirectiveSchema,
  FxQuoteInputSchema,
  FxFillInputSchema,
  type FxOfferTerms,
  type InterbankTerms,
  type FxDirective,
  type FxFillInput,
};
