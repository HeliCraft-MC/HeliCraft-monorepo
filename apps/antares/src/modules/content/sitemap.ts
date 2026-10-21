import { OpenAPIHono } from '@hono/zod-openapi';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import type { Database } from '../../db';
import {
  companies,
  contentDocuments,
  galleryImages,
  fxOffers,
  centralBanks,
  states,
} from '../../db/schema';
import { availableFxFilter } from '../fx/catalogue';
import { DomainError, HTTP } from '../errors';

const STATIC_PAGES = [
  '/',
  '/world',
  '/start',
  '/rules',
  '/chronicle',
  '/gallery',
  '/companies',
  '/exchange',
];
function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
async function companyUrls(db: Database['db'], origin: string): Promise<string[]> {
  const registered = await db
    .select({ id: companies.id })
    .from(companies)
    .where(
      and(
        isNotNull(companies.foundedAt),
        isNotNull(companies.currentRevisionId),
        inArray(companies.status, ['ACTIVE', 'SUSPENDED', 'CLOSED']),
      ),
    );
  return registered.map(
    (company) => `<url><loc>${xml(new URL(`/companies/${company.id}`, origin).href)}</loc></url>`,
  );
}
async function exchangeUrls(db: Database['db'], origin: string): Promise<string[]> {
  const offers = await db
    .select({ id: fxOffers.id })
    .from(fxOffers)
    .innerJoin(centralBanks, eq(centralBanks.id, fxOffers.bankId))
    .innerJoin(states, eq(states.id, fxOffers.stateId))
    .where(availableFxFilter());
  return offers.map(
    (offer) => `<url><loc>${xml(new URL(`/exchange/${offer.id}`, origin).href)}</loc></url>`,
  );
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
    const staticPages = STATIC_PAGES.map(
      (path) => `<url><loc>${xml(new URL(path, origin).href)}</loc></url>`,
    );
    const publications = documents
      .filter((document) => document.kind !== 'PAGE' || !['rules', 'start'].includes(document.slug))
      .map(
        (document) =>
          `<url><loc>${xml(new URL(`/${document.kind === 'PAGE' ? 'pages' : 'chronicle'}/${document.slug}`, origin).href)}</loc><lastmod>${document.updatedAt.toISOString()}</lastmod></url>`,
      );
    const photos = await db
      .select({ id: galleryImages.id, createdAt: galleryImages.createdAt })
      .from(galleryImages)
      .where(isNull(galleryImages.deletedAt));
    const gallery = photos.map(
      (photo) =>
        `<url><loc>${xml(new URL(`/gallery/${photo.id}`, origin).href)}</loc><lastmod>${photo.createdAt.toISOString()}</lastmod></url>`,
    );
    const companyPages = await companyUrls(db, origin);
    const exchanges = await exchangeUrls(db, origin);
    context.header('Content-Type', 'application/xml; charset=utf-8');
    return context.body(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticPages, ...publications, ...gallery, ...companyPages, ...exchanges].join('')}</urlset>`,
    );
  });
  return app;
}

export { sitemapRoutes };
