import { OpenAPIHono } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { contentDocuments } from '../../db/schema';
import { DomainError, HTTP } from '../errors';

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
function sitemapRoutes(db: Database['db'] | undefined, origin: string): OpenAPIHono {
  const app = new OpenAPIHono();
  app.get('/robots.txt', (context) =>
    context.text(
      `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /admin\nDisallow: /api\nDisallow: /login\nDisallow: /register\nSitemap: ${origin}/sitemap.xml\n`,
    ),
  );
  app.get('/sitemap.xml', async (context) => {
    if (db === undefined) {
      throw new DomainError(
        HTTP.unavailable,
        'PERSISTENCE_UNAVAILABLE',
        'Карта сайта временно недоступна',
      );
    }
    const documents = await db
      .select({
        kind: contentDocuments.kind,
        slug: contentDocuments.slug,
        updatedAt: contentDocuments.updatedAt,
      })
      .from(contentDocuments)
      .where(eq(contentDocuments.status, 'PUBLISHED'));
    const staticPages = ['/', '/world', '/start', '/rules', '/chronicle'].map(
      (path) => `<url><loc>${xml(new URL(path, origin).href)}</loc></url>`,
    );
    const publications = documents
      .filter((document) => document.kind !== 'PAGE' || !['rules', 'start'].includes(document.slug))
      .map(
        (document) =>
          `<url><loc>${xml(new URL(`/${document.kind === 'PAGE' ? 'pages' : 'chronicle'}/${document.slug}`, origin).href)}</loc><lastmod>${document.updatedAt.toISOString()}</lastmod></url>`,
      );
    context.header('Content-Type', 'application/xml; charset=utf-8');
    return context.body(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticPages, ...publications].join('')}</urlset>`,
    );
  });
  return app;
}

export { sitemapRoutes };
