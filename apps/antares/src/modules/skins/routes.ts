import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getCookie } from 'hono/cookie';
import type { S3Client } from '@aws-sdk/client-s3';
import type { Database } from '../../db';
import { SkinService } from './service';
import { SessionService } from '../sessions/service';
import { HTTP, DomainError } from '../errors';
import { MAX_UPLOAD_BYTES } from './process';

const SkinSchema = z
  .object({
    id: z.uuid(),
    model: z.enum(['CLASSIC', 'SLIM']),
    width: z.number(),
    height: z.number(),
    createdAt: z.iso.datetime(),
    skinUrl: z.string(),
    avatarUrl: z.string(),
  })
  .nullable()
  .openapi('CurrentSkin');
const ErrorSchema = z.object({ message: z.string(), code: z.string().optional() });
const errors = {
  400: { description: 'Invalid PNG', content: { 'application/json': { schema: ErrorSchema } } },
  401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
  413: { description: 'Too large', content: { 'application/json': { schema: ErrorSchema } } },
  503: {
    description: 'Storage unavailable',
    content: { 'application/json': { schema: ErrorSchema } },
  },
};
const skinResponse = {
  200: { description: 'Current skin', content: { 'application/json': { schema: SkinSchema } } },
  ...errors,
};
interface SkinDependencies {
  readonly db?: Database['db'];
  readonly storage?: S3Client;
  readonly bucket?: string;
  readonly secureCookies: boolean;
}

function describeSkin(
  skin: Awaited<ReturnType<SkinService['current']>>,
  userId: string,
): z.infer<typeof SkinSchema> {
  if (!skin) {
    return null;
  }
  return {
    id: skin.id,
    model: skin.model,
    width: skin.width,
    height: skin.height,
    createdAt: skin.createdAt.toISOString(),
    skinUrl: `/api/v1/public/players/${userId}/skin.png?v=${skin.id}`,
    avatarUrl: `/api/v1/public/players/${userId}/avatar.png?v=${skin.id}`,
  };
}

function skinRoutes(dependencies: SkinDependencies): OpenAPIHono {
  const app = new OpenAPIHono();
  const service =
    dependencies.db !== undefined &&
    dependencies.storage !== undefined &&
    dependencies.bucket !== undefined
      ? new SkinService(dependencies.db, dependencies.storage, dependencies.bucket)
      : null;
  const sessions = dependencies.db ? new SessionService(dependencies.db) : null;
  const cookieName = dependencies.secureCookies ? '__Host-helicraft' : 'helicraft_session';
  function requireService(): SkinService {
    if (!service) {
      throw new DomainError(HTTP.unavailable, 'STORAGE_UNAVAILABLE', 'Сервис скинов недоступен');
    }
    return service;
  }
  const currentRoute = createRoute({
    method: 'get',
    path: '/account/skin',
    operationId: 'getSkin',
    responses: skinResponse,
  });
  app.openapi(currentRoute, async (context) => {
    if (!sessions) {
      throw new DomainError(
        HTTP.unavailable,
        'PERSISTENCE_UNAVAILABLE',
        'Сервис аккаунтов недоступен',
      );
    }
    const current = await sessions.authenticate(getCookie(context, cookieName));
    return context.json(
      describeSkin(await requireService().current(current.principal.id), current.principal.id),
      HTTP.ok,
    );
  });
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/skin',
      operationId: 'uploadSkin',
      request: {
        body: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: z.object({
                file: z.instanceof(File).openapi({ type: 'string', format: 'binary' }),
                model: z.enum(['CLASSIC', 'SLIM']),
              }),
            },
          },
        },
      },
      responses: skinResponse,
    }),
    async (context) => {
      if (!sessions) {
        throw new DomainError(
          HTTP.unavailable,
          'PERSISTENCE_UNAVAILABLE',
          'Сервис аккаунтов недоступен',
        );
      }
      const current = await sessions.authenticate(getCookie(context, cookieName));
      const { file, model } = context.req.valid('form');
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new DomainError(HTTP.tooLarge, 'SKIN_TOO_LARGE', 'Максимальный размер — 2 МиБ');
      }
      if (file.type !== 'image/png' && file.type !== 'application/octet-stream') {
        throw new DomainError(HTTP.badRequest, 'INVALID_SKIN', 'Загрузите PNG');
      }
      const skin = await requireService().upload(
        current.principal.id,
        Buffer.from(await file.arrayBuffer()),
        model,
      );
      return context.json(describeSkin(skin, current.principal.id), HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'delete',
      path: '/account/skin',
      operationId: 'resetSkin',
      responses: skinResponse,
    }),
    async (context) => {
      if (!sessions) {
        throw new DomainError(
          HTTP.unavailable,
          'PERSISTENCE_UNAVAILABLE',
          'Сервис аккаунтов недоступен',
        );
      }
      const current = await sessions.authenticate(getCookie(context, cookieName));
      await requireService().reset(current.principal.id);
      return context.json(null, HTTP.ok);
    },
  );
  for (const image of ['skin', 'avatar'] as const) {
    app.openapi(
      createRoute({
        method: 'get',
        path: `/public/players/{uuid}/${image}.png`,
        operationId: image === 'skin' ? 'getPlayerSkin' : 'getPlayerAvatar',
        request: { params: z.object({ uuid: z.uuid() }) },
        responses: {
          200: {
            description: 'PNG image',
            content: { 'image/png': { schema: z.string().openapi({ format: 'binary' }) } },
          },
          404: {
            description: 'No custom skin',
            content: { 'application/json': { schema: ErrorSchema } },
          },
          ...errors,
        },
      }),
      async (context) => {
        const { uuid } = context.req.valid('param');
        const png = await requireService().image(uuid, image === 'avatar');
        if (!png) {
          throw new DomainError(HTTP.notFound, 'NO_CUSTOM_SKIN', 'Кастомный скин не установлен');
        }
        context.header('Cache-Control', 'public, max-age=0, must-revalidate');
        context.header('Content-Type', 'image/png');
        return context.body(new Uint8Array(png), HTTP.ok);
      },
    );
  }
  return app;
}
export { skinRoutes, type SkinDependencies };
