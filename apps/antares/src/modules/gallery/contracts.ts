import { LanguageSchema, GalleryTranslationsSchema } from '../translations';
// oxlint-disable no-magic-numbers -- Schema numbers are explicit product limits and Minecraft coordinate bounds.
import { z } from '@hono/zod-openapi';

const LocationSchema = z.object({
  x: z.number().int().min(-30_000_000).max(30_000_000),
  y: z.number().int().min(-2048).max(2048),
  z: z.number().int().min(-30_000_000).max(30_000_000),
  dimension: z.enum(['overworld', 'nether', 'end']),
});
const GalleryMetadataSchema = z.object({
  originalLanguage: LanguageSchema.default('ru'),
  translations: GalleryTranslationsSchema.default({}),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(''),
  alt: z.string().trim().min(1).max(500),
  place: z.string().trim().max(160).default(''),
  location: LocationSchema.nullable().default(null),
  players: z.array(z.uuid()).max(20).default([]),
});
const GalleryItemSchema = GalleryMetadataSchema.omit({ players: true })
  .extend({
    id: z.uuid(),
    author: z.object({ id: z.uuid(), name: z.string() }),
    players: z.array(z.object({ id: z.uuid(), name: z.string() })),
    width: z.number().int(),
    height: z.number().int(),
    createdAt: z.iso.datetime(),
    imageUrl: z.string(),
    thumbnailUrl: z.string(),
  })
  .openapi('GalleryItem');
const GalleryListSchema = z.object({ items: z.array(GalleryItemSchema), total: z.number().int() });
const GalleryPlayerListSchema = z.object({ items: GalleryItemSchema.shape.players });
type GalleryMetadata = z.infer<typeof GalleryMetadataSchema>;
type GalleryItem = z.infer<typeof GalleryItemSchema>;
export {
  GalleryMetadataSchema,
  GalleryItemSchema,
  GalleryListSchema,
  GalleryPlayerListSchema,
  type GalleryMetadata,
  type GalleryItem,
};
