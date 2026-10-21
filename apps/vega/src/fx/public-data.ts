// oxlint-disable node/no-process-env -- Public SSR reads only published offers using a dedicated cookie-free API client.
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  createClient,
  getSite,
  listFxOffers,
  getFxOffer,
  listPublicFxOfferFills,
} from '@helicraft/alhena';

import { fxSearch } from './catalogue-search';

const NOT_FOUND = 404;
function publicClient(): ReturnType<typeof createClient> {
  return createClient({
    baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    credentials: 'omit',
  });
}
const loadFxOffers = createServerFn({ method: 'GET' })
  .validator(fxSearch)
  .handler(async ({ data }) => {
    const client = publicClient();
    const [site, offers] = await Promise.all([
      getSite({ client, throwOnError: true }),
      listFxOffers({ client, query: data, throwOnError: false }).catch(() => null),
    ]);
    return { site: site.data, offers: offers?.data ?? null };
  });
const loadFxOffer = createServerFn({ method: 'GET' })
  .validator(fxSearch.extend({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const client = publicClient();
    const [site, offer, fills] = await Promise.all([
      getSite({ client, throwOnError: true }),
      getFxOffer({ client, path: { id: data.id }, throwOnError: false }).catch(() => null),
      listPublicFxOfferFills({
        client,
        path: { id: data.id },
        query: { page: data.page },
        throwOnError: false,
      }).catch(() => null),
    ]);
    return {
      site: site.data,
      offer: offer?.data ?? null,
      missing: offer?.response?.status === NOT_FOUND,
      fills: fills?.data ?? null,
    };
  });
export { loadFxOffers, loadFxOffer };
export { fxSearch } from './catalogue-search';
