// oxlint-disable no-magic-numbers -- Translation constraints mirror the named original content and caption fields.
import { z } from '@hono/zod-openapi';

const LanguageSchema = z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u);
const ContentTranslationSchema = z.strictObject({
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(500).optional(),
  markdown: z.string().max(100_000).optional(),
  seoTitle: z.string().trim().max(160).nullable().optional(),
  seoDescription: z.string().trim().max(500).nullable().optional(),
});
const PublicTranslationSchema = ContentTranslationSchema.omit({ markdown: true }).extend({
  html: z.string().optional(),
});
const GalleryTranslationSchema = z.strictObject({
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  alt: z.string().trim().max(500).optional(),
  place: z.string().trim().max(160).optional(),
});
const ContentTranslationsSchema = z.record(LanguageSchema, ContentTranslationSchema);
const PublicTranslationsSchema = z.record(LanguageSchema, PublicTranslationSchema);
const GalleryTranslationsSchema = z.record(LanguageSchema, GalleryTranslationSchema);
type ContentTranslations = z.infer<typeof ContentTranslationsSchema>;
type GalleryTranslations = z.infer<typeof GalleryTranslationsSchema>;
export {
  LanguageSchema,
  ContentTranslationsSchema,
  PublicTranslationsSchema,
  GalleryTranslationsSchema,
  type ContentTranslations,
  type GalleryTranslations,
};
