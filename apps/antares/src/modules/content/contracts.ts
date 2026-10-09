import { z } from '@hono/zod-openapi';

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;
const MAX_MARKDOWN = 100_000;
const MAX_TITLE = 160;
const MAX_DESCRIPTION = 500;
const MAX_SLUG = 120;
const reserved = new Set([
  'admin',
  'api',
  'app',
  'login',
  'register',
  'world',
  'chronicle',
  'pages',
]);
const SlugSchema = z
  .string()
  .min(1)
  .max(MAX_SLUG)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  .refine((slug) => !reserved.has(slug));
const ContentInputSchema = z.strictObject({
  slug: SlugSchema,
  title: z.string().trim().min(1).max(MAX_TITLE),
  description: z.string().trim().max(MAX_DESCRIPTION),
  markdown: z.string().max(MAX_MARKDOWN),
  seoTitle: z.string().trim().max(MAX_TITLE).nullable().default(null),
  seoDescription: z.string().trim().max(MAX_DESCRIPTION).nullable().default(null),
  category: z
    .enum(['Мир', 'Сообщество', 'Строительство', 'События', 'Обновления проекта'])
    .default('Обновления проекта'),
  isFeatured: z.boolean().default(false),
});
const PublicContentSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(['PAGE', 'CHRONICLE']),
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    html: z.string(),
    seoTitle: z.string().nullable(),
    seoDescription: z.string().nullable(),
    category: z.string(),
    isFeatured: z.boolean(),
    publishedAt: z.iso.datetime().nullable(),
    updatedAt: z.iso.datetime(),
    author: z.string(),
  })
  .openapi('PublicContent');
const AdminContentSchema = PublicContentSchema.extend({
  markdown: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  revision: z.number().int(),
  createdBy: z.uuid(),
  updatedBy: z.uuid(),
}).openapi('AdminContent');
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
type ContentInput = z.infer<typeof ContentInputSchema>;
type PublicContent = z.infer<typeof PublicContentSchema>;
type AdminContent = z.infer<typeof AdminContentSchema>;
type ContentKind = 'PAGE' | 'CHRONICLE';

export {
  ContentInputSchema,
  PublicContentSchema,
  AdminContentSchema,
  PaginationSchema,
  type ContentInput,
  type PublicContent,
  type AdminContent,
  type ContentKind,
};
