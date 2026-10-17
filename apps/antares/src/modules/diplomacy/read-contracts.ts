import { z } from '@hono/zod-openapi';
import { StateConfigurationSchema } from '../states/contracts';
import { LocalizedInputSchema } from '../localized-content/contracts';
import { TreatyContentSchema } from './contracts';

const TreatyPartySchema = z.object({
  id: z.uuid(),
  slug: z.string().nullable(),
  name: LocalizedInputSchema,
  color: z.string().nullable(),
  flag: z
    .object({ horizontal: StateConfigurationSchema.shape.horizontalFlag })
    .nullable()
    .openapi('OptionalTreatyFlag'),
});
const TreatyRevisionSchema = z
  .object({
    id: z.uuid(),
    number: z.number().int(),
    contentHash: z.string(),
    content: TreatyContentSchema,
    createdAt: z.iso.datetime(),
  })
  .openapi('TreatyRevision');
const TreatySchema = z
  .object({
    id: z.uuid(),
    type: z.literal('TAX_TREATY'),
    proposerStateId: z.uuid(),
    status: z.enum(['DRAFT', 'PROPOSED', 'ACTIVE', 'REJECTED', 'EXPIRED', 'TERMINATED']),
    currentRevisionId: z.uuid(),
    activeRevisionId: z.uuid().nullable(),
    parties: z.array(TreatyPartySchema),
    revisions: z.array(TreatyRevisionSchema),
    decisions: z.array(
      z.object({
        stateId: z.uuid(),
        directiveId: z.uuid(),
        revisionId: z.uuid(),
        kind: z.string(),
        current: z.boolean(),
      }),
    ),
  })
  .openapi('Treaty');
const TreatyHistorySchema = z
  .object({
    items: z.array(TreatyRevisionSchema),
    decisions: z.array(
      z.object({
        directiveId: z.uuid(),
        revisionId: z.uuid(),
        stateId: z.uuid(),
        kind: z.string(),
        createdAt: z.iso.datetime(),
      }),
    ),
    page: z.number().int(),
    hasMore: z.boolean(),
  })
  .openapi('TreatyRevisionHistory');
const PublicTreatySchema = z
  .object({
    id: z.uuid(),
    type: z.literal('TAX_TREATY'),
    status: z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED']),
    name: LocalizedInputSchema,
    activeRevisionId: z.uuid(),
    page: z.number().int(),
    hasMore: z.boolean(),
    parties: z.array(TreatyPartySchema),
    revisions: z.array(
      z.object({
        id: z.uuid(),
        number: z.number().int(),
        contentHash: z.string(),
        name: LocalizedInputSchema,
        description: LocalizedInputSchema,
        documentHtml: z.string(),
        event: z.literal('PLAYER_TRANSFER'),
        category: z.string(),
        terms: TreatyContentSchema.shape.terms,
        effectiveAt: z.iso.datetime(),
        expiresAt: z.iso.datetime().nullable(),
      }),
    ),
  })
  .openapi('PublicTreaty');
export { TreatySchema, TreatyRevisionSchema, PublicTreatySchema, TreatyHistorySchema };
