// oxlint-disable node/no-process-env -- Environment access is confined to createServerFn handlers and stripped from the client bundle.
import { createServerFn } from '@tanstack/react-start';
import { createClient, getSite, listGallery, listPublicPages, listStates } from '@helicraft/alhena';

const loadPublicHome = createServerFn({ method: 'GET' }).handler(async () => {
  const client = createClient({
    baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    credentials: 'omit',
  });
  const [siteResponse, gallery, states] = await Promise.all([
    getSite({ client, throwOnError: true }),
    listGallery({ client, query: { page: 1, pageSize: 6 }, throwOnError: false }).catch(() => null),
    listStates({ client, query: { pageSize: 3, sort: 'POPULATION' }, throwOnError: false }).catch(
      () => null,
    ),
  ]);
  const site = siteResponse.data;
  return { site, gallery: gallery?.data ?? null, states: states?.data ?? null };
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
