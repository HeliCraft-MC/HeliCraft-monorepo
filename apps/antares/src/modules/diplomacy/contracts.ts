// oxlint-disable no-magic-numbers -- Bilateral treaty scope and basis-point bounds are V1 domain limits.
import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';
import { TaxEventSchema, TaxIdentity } from '../taxation/contracts';

const TreatyTermsSchema = z
  .discriminatedUnion('mode', [
    z.object({ mode: z.literal('EXCLUSIVE'), taxingStateId: z.uuid() }).strict(),
    z
      .object({
        mode: z.literal('SHARED'),
        rateBps: z.number().int().min(0).max(10_000),
        firstShareBps: z.number().int().min(0).max(10_000),
      })
      .strict(),
  ])
  .openapi('TreatyTaxTerms');
const TreatyContentSchema = z
  .object({
    ...TaxIdentity,
    document: LocalizedInputSchema,
    type: z.literal('TAX_TREATY'),
    event: TaxEventSchema,
    category: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/u),
    taxpayerScope: z.literal('OVERLAPPING_NATIONAL_CLAIMS'),
    terms: TreatyTermsSchema,
    effectiveAt: z.iso.datetime(),
    expiresAt: z.iso.datetime().nullable(),
    termination: z.literal('BILATERAL'),
  })
  .strict()
  .refine(
    (value) => value.expiresAt === null || value.expiresAt > value.effectiveAt,
    'Expiry must follow effective date',
  )
  .openapi('TreatyContent');
const TreatyDraftSchema = z
  .object({ partnerStateId: z.uuid(), content: TreatyContentSchema })
  .strict()
  .openapi('TreatyDraftInput');
const TreatyEditSchema = z
  .object({ baseRevisionId: z.uuid(), content: TreatyContentSchema })
  .strict();
const TreatyDirectiveSchemas = [
  z
    .object({
      kind: z.literal('AMEND_TREATY'),
      treatyId: z.uuid(),
      revisionId: z.uuid(),
      contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
    })
    .strict(),
  z
    .object({
      kind: z.literal('RATIFY_TREATY'),
      treatyId: z.uuid(),
      revisionId: z.uuid(),
      contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
    })
    .strict(),
  z
    .object({
      kind: z.literal('DENOUNCE_TREATY'),
      treatyId: z.uuid(),
      revisionId: z.uuid(),
      contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
    })
    .strict(),
  z
    .object({
      kind: z.literal('REJECT_TREATY'),
      treatyId: z.uuid(),
      revisionId: z.uuid(),
      contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
    })
    .strict(),
] as const;
const TreatyDirectiveSchema = z.discriminatedUnion('kind', TreatyDirectiveSchemas);
type TreatyContent = z.infer<typeof TreatyContentSchema>;
type TreatyDirective = z.infer<typeof TreatyDirectiveSchema>;
type TreatyTerms = z.infer<typeof TreatyTermsSchema>;
export {
  TreatyTermsSchema,
  TreatyContentSchema,
  TreatyDraftSchema,
  TreatyEditSchema,
  TreatyDirectiveSchemas,
  TreatyDirectiveSchema,
  type TreatyContent,
  type TreatyDirective,
  type TreatyTerms,
};
