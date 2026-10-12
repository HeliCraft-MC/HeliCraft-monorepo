// oxlint-disable node/no-process-env -- Server-only API origin; public requests deliberately omit credentials.
import { createServerFn } from '@tanstack/react-start';
import { createClient, getGalleryItem, getSite, listGallery } from '@helicraft/alhena';
import { z } from 'zod';
import { HTTP } from './http-status';

const loadGallery = createServerFn({ method: 'GET' })
  .validator(z.object({ page: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const site = await getSite({ client, throwOnError: true });
    const gallery = await listGallery({
      client,
      query: { page: data.page, pageSize: 18 },
      throwOnError: false,
    }).catch(() => null);
    return { site: site.data, gallery: gallery?.data ?? null, page: data.page };
  });
const loadGalleryDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const site = await getSite({ client, throwOnError: true });
    if (!z.uuid().safeParse(data.id).success) {
      return { site: site.data, item: null, status: HTTP.notFound };
    }
    const response = await getGalleryItem({ client, path: { id: data.id }, throwOnError: false });
    return {
      site: site.data,
      item: response.data ?? null,
      status: response.response?.status ?? HTTP.unavailable,
    };
  });
export { loadGallery, loadGalleryDetail };
