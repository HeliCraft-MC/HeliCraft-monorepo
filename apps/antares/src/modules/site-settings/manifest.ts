import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { SiteConfig } from '../content/site';
import { readSiteSettings } from './service';
import { HTTP } from '../errors';

const ManifestSchema = z.object({
  name: z.string(),
  short_name: z.string(),
  description: z.string(),
  start_url: z.string(),
  scope: z.string(),
  display: z.literal('standalone'),
  theme_color: z.string(),
  background_color: z.string(),
  icons: z.array(z.object({ src: z.string(), sizes: z.string(), type: z.literal('image/png') })),
});
function manifestRoutes(config: SiteConfig): OpenAPIHono {
  const app = new OpenAPIHono();
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/site/manifest.webmanifest',
      operationId: 'getSiteManifest',
      responses: {
        200: {
          description: 'Current public server identity for installation',
          content: { 'application/manifest+json': { schema: ManifestSchema } },
        },
      },
    }),
    async (context) => {
      const settings = await readSiteSettings(config.db, config);
      const icons: z.infer<typeof ManifestSchema>['icons'] =
        settings.logoUrl === null
          ? [
              { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            ]
          : [{ src: settings.logoUrl, sizes: '512x512', type: 'image/png' }];
      return context.json(
        {
          name: settings.serverName,
          short_name: settings.serverName,
          description: settings.serverName,
          start_url: '/',
          scope: '/',
          display: 'standalone' as const,
          theme_color: '#0e0a06',
          background_color: '#0e0a06',
          icons,
        },
        HTTP.ok,
        { 'Content-Type': 'application/manifest+json' },
      );
    },
  );
  return app;
}
export { manifestRoutes };
