import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { S3Client } from '@aws-sdk/client-s3';
import type { Database } from '../../db';
import { authenticator, json } from '../platform/routes';
import { requirePermission } from '../permissions/policy';
import { MediaObjects } from '../media/objects';
import { DomainError, HTTP } from '../errors';
import { SiteSettingsInput, SiteSettingsSchema } from './contracts';
import type { SiteDefaults } from './contracts';
import { readSiteSettings, saveSiteSettings } from './service';
import { changeLogo, readLogo } from './logo';

interface SettingsDependencies extends SiteDefaults {
  readonly db?: Database['db'];
  readonly storage?: S3Client;
  readonly bucket?: string;
  readonly secureCookies: boolean;
}
const errors = {
  400: json(z.object({ message: z.string() })),
  401: json(z.object({ message: z.string() })),
  403: json(z.object({ message: z.string() })),
  413: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
// oxlint-disable-next-line max-lines-per-function -- Typed route declarations keep settings read/write, logo lifecycle and their response contracts together.
function siteSettingsRoutes(dependencies: SettingsDependencies): OpenAPIHono {
  const app = new OpenAPIHono();
  const authenticate = authenticator(dependencies.db, dependencies.secureCookies);
  function database(): Database['db'] {
    if (dependencies.db === undefined) {
      throw new DomainError(HTTP.unavailable, 'PERSISTENCE_UNAVAILABLE', 'Настройки недоступны');
    }
    return dependencies.db;
  }
  function media(): MediaObjects {
    if (dependencies.storage === undefined || dependencies.bucket === undefined) {
      throw new DomainError(HTTP.unavailable, 'STORAGE_UNAVAILABLE', 'Хранилище недоступно');
    }
    return new MediaObjects(dependencies.storage, dependencies.bucket);
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/admin/site-settings',
      operationId: 'getSiteSettings',
      responses: { 200: json(SiteSettingsSchema), ...errors },
    }),
    async (context) => {
      const principal = await authenticate(context);
      requirePermission(principal.roles, 'site.manage');
      return context.json(await readSiteSettings(database(), dependencies), HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'put',
      path: '/admin/site-settings',
      operationId: 'updateSiteSettings',
      request: {
        body: { required: true, content: { 'application/json': { schema: SiteSettingsInput } } },
      },
      responses: { 200: json(SiteSettingsSchema), ...errors },
    }),
    async (context) => {
      const principal = await authenticate(context);
      await saveSiteSettings(database(), principal.id, context.req.valid('json'));
      return context.json(await readSiteSettings(database(), dependencies), HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/admin/site-settings/logo',
      operationId: 'uploadSiteLogo',
      request: {
        body: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: z.object({
                file: z.instanceof(File).openapi({ type: 'string', format: 'binary' }),
              }),
            },
          },
        },
      },
      responses: { 200: json(SiteSettingsSchema), ...errors },
    }),
    async (context) => {
      const principal = await authenticate(context);
      requirePermission(principal.roles, 'site.manage');
      await changeLogo(
        database(),
        { media: media(), defaults: dependencies },
        {
          actorId: principal.id,
          bytes: Buffer.from(await context.req.valid('form').file.arrayBuffer()),
        },
      );
      return context.json(await readSiteSettings(database(), dependencies), HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'delete',
      path: '/admin/site-settings/logo',
      operationId: 'resetSiteLogo',
      responses: { 200: json(SiteSettingsSchema), ...errors },
    }),
    async (context) => {
      const principal = await authenticate(context);
      await changeLogo(
        database(),
        { media: media(), defaults: dependencies },
        { actorId: principal.id, bytes: null },
      );
      return context.json(await readSiteSettings(database(), dependencies), HTTP.ok);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/site/logo.png',
      operationId: 'getSiteLogo',
      responses: {
        200: {
          description: 'Normalized logo',
          content: { 'image/png': { schema: z.string().openapi({ format: 'binary' }) } },
        },
        404: json(z.object({ message: z.string() })),
        ...errors,
      },
    }),
    async (context) => {
      const bytes = await readLogo(database(), media());
      context.header('Content-Type', 'image/png');
      return context.body(new Uint8Array(bytes), HTTP.ok);
    },
  );
  return app;
}
export { siteSettingsRoutes };
