// oxlint-disable node/no-process-env -- Environment access is confined to createServerFn handlers and stripped from the client bundle.
import { createServerFn } from '@tanstack/react-start';
import { createClient, getSite, listGallery, listPublicPages } from '@helicraft/alhena';

const loadPublicHome = createServerFn({ method: 'GET' }).handler(async () => {
  const client = createClient({
    baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    credentials: 'omit',
  });
  const { data: site } = await getSite({ client, throwOnError: true });
  const gallery = await listGallery({
    client,
    query: { page: 1, pageSize: 6 },
    throwOnError: false,
  }).catch(() => null);
  return { site, gallery: gallery?.data ?? null };
});

const loadPublicSite = createServerFn({ method: 'GET' }).handler(async () => {
  const client = createClient({
    baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    credentials: 'omit',
  });
  const { data } = await getSite({ client, throwOnError: true });
  return data;
});

const loadPublicNavigation = createServerFn({ method: 'GET' }).handler(async () => {
  const client = createClient({
    baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    credentials: 'omit',
  });
  const [site, pages] = await Promise.all([
    getSite({ client, throwOnError: false }),
    listPublicPages({ client, query: { page: 1, pageSize: 50 }, throwOnError: false }),
  ]);
  return { site: site.data ?? null, pages: pages.data?.items ?? [] };
});
export { loadPublicHome, loadPublicSite, loadPublicNavigation };
