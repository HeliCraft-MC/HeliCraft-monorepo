import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import { MinorSchema, PositiveMinorSchema } from '../monetary/amount-contracts';
import { DirectiveDetailSchema } from '../monetary/contracts';
import { FxOfferTermsSchema, InterbankTermsSchema } from './contracts';

const FxCurrencySchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: LocalizedInputSchema,
  status: z.enum(['ACTIVE', 'BLOCKED']),
});
const FxBankIdentitySchema = z.object({
  id: z.uuid(),
  stateId: z.uuid(),
  name: LocalizedInputSchema,
  stateName: LocalizedInputSchema,
  available: z.boolean(),
});
const FxOfferSchema = z
  .object({
    id: z.uuid(),
    bank: FxBankIdentitySchema,
    terms: FxOfferTermsSchema,
    termsHash: z.string(),
    remainingLots: MinorSchema,
    reservedMinor: MinorSchema,
    status: z.enum(['ACTIVE', 'FILLED', 'CANCELLED', 'EXPIRED']),
    executable: z.boolean(),
    publishDirectiveId: z.uuid(),
    createdAt: z.iso.datetime(),
    currencies: z.array(FxCurrencySchema),
  })
  .openapi('FxOffer');
const FxOfferListSchema = z
  .object({
    items: z.array(FxOfferSchema),
    page: z.number().int(),
    hasMore: z.boolean(),
    currencies: z.array(FxCurrencySchema).optional(),
  })
  .openapi('FxOfferList');
const FxQuoteSchema = z
  .object({
    id: z.uuid(),
    offerId: z.uuid(),
    termsHash: z.string(),
    lots: PositiveMinorSchema,
    receiveMinor: PositiveMinorSchema,
    provideMinor: PositiveMinorSchema,
    expiresAt: z.iso.datetime(),
    createdAt: z.iso.datetime(),
  })
  .openapi('FxQuote');
const FxReceiptSchema = z
  .object({
    id: z.uuid(),
    event: z.literal('FX_EXCHANGE'),
    actorId: z.uuid(),
    offerId: z.uuid().nullable(),
    tradeId: z.uuid().nullable(),
    quoteId: z.uuid().nullable(),
    receiveCurrencyId: z.uuid(),
    provideCurrencyId: z.uuid(),
    receiveMinor: PositiveMinorSchema,
    provideMinor: PositiveMinorSchema,
    firstApprovalId: z.uuid().nullable(),
    secondApprovalId: z.uuid().nullable(),
    journals: z.array(z.object({ leg: z.enum(['RECEIVE', 'PROVIDE']), journalId: z.uuid() })),
    currencies: z.array(FxCurrencySchema),
    createdAt: z.iso.datetime(),
  })
  .openapi('FxExchangeReceipt');
const InterbankTradeSchema = z
  .object({
    id: z.uuid(),
    terms: InterbankTermsSchema,
    termsHash: z.string(),
    status: z.enum(['PENDING', 'SETTLED']),
    createdAt: z.iso.datetime(),
    approvals: z.array(
      z.object({
        directiveId: z.uuid(),
        stateId: z.uuid(),
        actorId: z.uuid(),
        createdAt: z.iso.datetime(),
      }),
    ),
    exchangeId: z.uuid().nullable(),
    currencies: z.array(FxCurrencySchema),
    banks: z.array(FxBankIdentitySchema),
  })
  .openapi('InterbankExchange');
const StateFxSchema = z
  .object({
    offers: z.array(FxOfferSchema),
    trades: z.array(InterbankTradeSchema),
    decisions: z.array(DirectiveDetailSchema),
    page: z.number().int(),
    hasMore: z.boolean(),
  })
  .openapi('StateFx');
const FxReceiptListSchema = z
  .object({ items: z.array(FxReceiptSchema), page: z.number().int(), hasMore: z.boolean() })
  .openapi('FxExchangeHistory');
const FxOfferFillListSchema = z
  .object({
    items: z.array(
      z.object({
        id: z.uuid(),
        createdAt: z.iso.datetime(),
        lots: PositiveMinorSchema,
        receiveMinor: PositiveMinorSchema,
        provideMinor: PositiveMinorSchema,
      }),
    ),
    page: z.number().int(),
    hasMore: z.boolean(),
  })
  .openapi('PublicFxOfferFills');
type FxOffer = z.infer<typeof FxOfferSchema>;
type FxReceipt = z.infer<typeof FxReceiptSchema>;
type InterbankTrade = z.infer<typeof InterbankTradeSchema>;
type StateFx = z.infer<typeof StateFxSchema>;
type FxQuote = z.infer<typeof FxQuoteSchema>;
export {
  FxBankIdentitySchema,
  FxOfferSchema,
  FxOfferListSchema,
  FxQuoteSchema,
  FxReceiptSchema,
  FxReceiptListSchema,
  InterbankTradeSchema,
  StateFxSchema,
  FxOfferFillListSchema,
  type FxOffer,
  type FxReceipt,
  type InterbankTrade,
  type StateFx,
  type FxQuote,
};
