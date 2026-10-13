import { z } from '@hono/zod-openapi';
import { LocalizedInputSchema } from '../localized-content/contracts';

const PublicPlayerProfileSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    skinId: z.uuid().nullable(),
    registeredAt: z.iso.datetime(),
    states: z.array(
      z.object({
        id: z.uuid(),
        slug: z.string(),
        name: LocalizedInputSchema,
        color: z.string(),
        citizenSince: z.iso.datetime().nullable(),
        founder: z.boolean(),
        offices: z.array(
          z.object({ id: z.uuid(), name: LocalizedInputSchema, isHeadOfState: z.boolean() }),
        ),
      }),
    ),
  })
  .openapi('PublicPlayerProfile');
type PublicPlayerProfile = z.infer<typeof PublicPlayerProfileSchema>;
export { PublicPlayerProfileSchema, type PublicPlayerProfile };
