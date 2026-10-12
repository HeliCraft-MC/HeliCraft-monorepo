// oxlint-disable import/max-dependencies -- Route composition combines contracts, session authentication and gallery infrastructure.
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getCookie } from 'hono/cookie';
import type { Context } from 'hono';
import type { SkinDependencies } from '../skins/routes';
import { SessionService } from '../sessions/service';
import { DomainError, HTTP } from '../errors';
import { GalleryService } from './service';
import { GalleryObjects } from './objects';
import {
  GalleryItemSchema,
  GalleryListSchema,
  GalleryMetadataSchema,
  GalleryPlayerListSchema,
} from './contracts';
import { MAX_GALLERY_BYTES } from './process';
import { PaginationSchema } from '../content/contracts';

const MIN_PLAYER_QUERY = 2;
const MAX_PLAYER_QUERY = 16;
const MAX_METADATA_LENGTH = 12_000;
const IdParams = z.object({ id: z.uuid() });
const ErrorSchema = z.object({ message: z.string(), code: z.string().optional() });
function json<Schema extends z.ZodType>(
  schema: Schema,
): { description: string; content: Record<'application/json', { schema: Schema }> } {
  return { description: 'Result', content: { 'application/json': { schema } } };
}
const errors = {
  400: json(ErrorSchema),
  401: json(ErrorSchema),
  403: json(ErrorSchema),
  404: json(ErrorSchema),
  413: json(ErrorSchema),
  503: json(ErrorSchema),
};
// oxlint-disable-next-line max-lines-per-function -- Thin OpenAPI route declarations share one authenticated runtime.
function galleryRoutes(dependencies: SkinDependencies): OpenAPIHono {
  const app = new OpenAPIHono();
  const service =
    dependencies.db !== undefined &&
    dependencies.storage !== undefined &&
    dependencies.bucket !== undefined
      ? new GalleryService(
          dependencies.db,
          new GalleryObjects(dependencies.storage, dependencies.bucket),
        )
      : null;
  const sessions = dependencies.db ? new SessionService(dependencies.db) : null;
  function requireService(): GalleryService {
    if (!service) {
      throw new DomainError(HTTP.unavailable, 'GALLERY_UNAVAILABLE', 'Галерея временно недоступна');
    }
    return service;
  }
  async function owner(context: Context): Promise<string> {
    const cookie = getCookie(
      context,
      dependencies.secureCookies ? '__Host-helicraft' : 'helicraft_session',
    );
    if (cookie === undefined || cookie === '') {
      throw new DomainError(HTTP.unauthenticated, 'UNAUTHENTICATED', 'Войдите в аккаунт');
    }
    if (!sessions) {
      throw new DomainError(
        HTTP.unavailable,
        'PERSISTENCE_UNAVAILABLE',
        'Аккаунты временно недоступны',
      );
    }
    const current = await sessions.authenticate(cookie);
    return current.principal.id;
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/gallery',
      operationId: 'listGallery',
      request: { query: PaginationSchema },
      responses: { 200: json(GalleryListSchema), ...errors },
    }),
    async (context) => {
      const { page, pageSize } = context.req.valid('query');
      return context.json(await requireService().list(page, pageSize), HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/gallery/{id}',
      operationId: 'getGalleryItem',
      request: { params: IdParams },
      responses: { 200: json(GalleryItemSchema), ...errors },
    }),
    async (context) =>
      context.json(await requireService().detail(context.req.valid('param').id), HTTP.ok),
  );
  for (const variant of ['image', 'thumbnail'] as const) {
    app.openapi(
      createRoute({
        method: 'get',
        path: `/public/gallery/{id}/${variant}`,
        operationId: variant === 'image' ? 'getGalleryImage' : 'getGalleryThumbnail',
        request: { params: IdParams },
        responses: {
          200: {
            description: 'Normalized WebP',
            content: { 'image/webp': { schema: z.string().openapi({ format: 'binary' }) } },
          },
          ...errors,
        },
      }),
      async (context) => {
        const image = await requireService().image(
          context.req.valid('param').id,
          variant === 'thumbnail',
        );
        context.header('Content-Type', 'image/webp');
        context.header('Cache-Control', 'public, max-age=0, must-revalidate');
        return context.body(new Uint8Array(image), HTTP.ok);
      },
    );
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/account/gallery/players',
      operationId: 'searchGalleryPlayers',
      request: {
        query: z.object({
          query: z
            .string()
            .trim()
            .min(MIN_PLAYER_QUERY)
            .max(MAX_PLAYER_QUERY)
            .regex(/^[A-Za-z0-9_]+$/u),
        }),
      },
      responses: {
        200: json(GalleryPlayerListSchema),
        ...errors,
      },
    }),
    async (context) => {
      await owner(context);
      context.header('Cache-Control', 'no-store');
      return context.json(
        { items: await requireService().searchPlayers(context.req.valid('query').query) },
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/gallery',
      operationId: 'uploadGalleryImage',
      request: {
        body: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: z.object({
                file: z.instanceof(File).openapi({ type: 'string', format: 'binary' }),
                metadata: z.string().max(MAX_METADATA_LENGTH),
              }),
            },
          },
        },
      },
      responses: { 200: json(GalleryItemSchema), ...errors },
    }),
    async (context) => {
      const ownerId = await owner(context);
      const { file, metadata } = context.req.valid('form');
      if (file.size > MAX_GALLERY_BYTES) {
        throw new DomainError(HTTP.tooLarge, 'IMAGE_TOO_LARGE', 'Максимальный размер — 10 МиБ');
      }
      let input: unknown = null;
      try {
        input = JSON.parse(metadata);
      } catch {
        throw new DomainError(HTTP.badRequest, 'INVALID_METADATA', 'Проверьте описание снимка');
      }
      const parsed = GalleryMetadataSchema.safeParse(input);
      if (!parsed.success) {
        throw new DomainError(HTTP.badRequest, 'INVALID_METADATA', 'Проверьте описание снимка');
      }
      return context.json(
        await requireService().upload(ownerId, Buffer.from(await file.arrayBuffer()), parsed.data),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'patch',
      path: '/account/gallery/{id}',
      operationId: 'updateGalleryMetadata',
      request: {
        params: IdParams,
        body: {
          required: true,
          content: { 'application/json': { schema: GalleryMetadataSchema } },
        },
      },
      responses: { 200: json(GalleryItemSchema), ...errors },
    }),
    async (context) => {
      const ownerId = await owner(context);
      return context.json(
        await requireService().update(
          context.req.valid('param').id,
          ownerId,
          context.req.valid('json'),
        ),
        HTTP.ok,
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'delete',
      path: '/account/gallery/{id}',
      operationId: 'deleteGalleryImage',
      request: { params: IdParams },
      responses: { 200: json(z.object({ deleted: z.literal(true) })), ...errors },
    }),
    async (context) => {
      const ownerId = await owner(context);
      await requireService().remove(context.req.valid('param').id, ownerId);
      return context.json({ deleted: true as const }, HTTP.ok);
    },
  );
  return app;
}
export { galleryRoutes };
