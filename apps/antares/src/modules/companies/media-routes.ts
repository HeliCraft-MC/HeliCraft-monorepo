import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { SkinDependencies } from '../skins/routes';
import { authenticator, json } from '../platform/routes';
import { DomainError, HTTP } from '../errors';
import { RateLimiter } from '../sessions/security';
import { CompanyMediaService } from './media';

const UPLOADS_PER_WINDOW = 30;
const Ids = z.object({ id: z.uuid(), mediaId: z.uuid() });
const Errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  404: json(z.object({ message: z.string() })),
  409: json(z.object({ message: z.string() })),
  413: json(z.object({ message: z.string() })),
  429: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- Typed upload and protected/public media routes share one storage service and distinct access boundaries.
function companyMediaRoutes(dependencies: SkinDependencies): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(dependencies.db, dependencies.secureCookies);
  const limiter = new RateLimiter();
  function service(): CompanyMediaService {
    if (!dependencies.db || !dependencies.storage || dependencies.bucket === undefined) {
      throw new DomainError(HTTP.unavailable, 'STORAGE_UNAVAILABLE', 'Хранилище недоступно');
    }
    return new CompanyMediaService(dependencies.db, dependencies.storage, dependencies.bucket);
  }
  app.openapi(
    createRoute({
      method: 'post',
      path: '/account/companies/{id}/media',
      operationId: 'uploadCompanyMedia',
      request: {
        params: z.object({ id: z.uuid() }),
        query: z.object({ kind: z.enum(['LOGO', 'COVER']) }),
        body: {
          content: {
            'multipart/form-data': {
              schema: z.object({ file: z.file().openapi({ type: 'string', format: 'binary' }) }),
            },
          },
        },
      },
      responses: {
        200: json(z.object({ id: z.uuid(), width: z.number(), height: z.number() })),
        ...Errors,
      },
    }),
    async (context) => {
      const actor = await authenticate(context);
      limiter.take(`company-media:${actor.id}`, UPLOADS_PER_WINDOW);
      const form = await context.req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        throw new DomainError(HTTP.badRequest, 'FILE_REQUIRED', 'Выберите изображение');
      }
      return context.json(
        await service().upload(
          {
            companyId: context.req.valid('param').id,
            actorId: actor.id,
            kind: context.req.valid('query').kind,
          },
          file,
        ),
        HTTP.ok,
      );
    },
  );
  for (const protectedPreview of [true, false]) {
    app.openapi(
      createRoute({
        method: 'get',
        path: protectedPreview
          ? '/account/companies/{id}/media/{mediaId}'
          : '/public/companies/{id}/media/{mediaId}',
        operationId: protectedPreview ? 'getCompanyMediaPreview' : 'getPublishedCompanyMedia',
        request: { params: Ids },
        responses: {
          200: {
            description: 'Company image',
            content: { 'image/webp': { schema: z.string().openapi({ format: 'binary' }) } },
          },
          ...Errors,
        },
      }),
      async (context) => {
        const actor = protectedPreview ? await authenticate(context) : undefined;
        const { id, mediaId } = context.req.valid('param');
        const bytes = await service().read(id, mediaId, actor?.id);
        context.header('Content-Type', 'image/webp');
        context.header('X-Content-Type-Options', 'nosniff');
        context.header(
          'Cache-Control',
          protectedPreview ? 'private, no-store' : 'public, max-age=60',
        );
        return context.body(new Uint8Array(bytes), HTTP.ok);
      },
    );
  }
  for (const source of ['decision', 'application'] as const) {
    app.openapi(
      createRoute({
        method: 'get',
        path:
          source === 'decision'
            ? '/account/company-decisions/{id}/media/{mediaId}'
            : '/account/company-applications/{id}/media/{mediaId}',
        operationId:
          source === 'decision' ? 'getCompanyDecisionMedia' : 'getCompanyApplicationMedia',
        request: { params: Ids },
        responses: {
          200: {
            description: 'Private company review image',
            content: { 'image/webp': { schema: z.string().openapi({ format: 'binary' }) } },
          },
          ...Errors,
        },
      }),
      async (context) => {
        const actor = await authenticate(context);
        const input = { ...context.req.valid('param'), actorId: actor.id };
        const bytes =
          source === 'decision'
            ? await service().decisionImage(input)
            : await service().applicationImage(input);
        context.header('Content-Type', 'image/webp');
        context.header('X-Content-Type-Options', 'nosniff');
        context.header('Cache-Control', 'private, no-store');
        return context.body(new Uint8Array(bytes), HTTP.ok);
      },
    );
  }
  return app;
}
export { companyMediaRoutes };
