// oxlint-disable node/no-process-env -- Public map SSR uses a dedicated cookie-free client for published world metadata and geometry only.
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  createClient,
  getSite,
  listSpatialWorlds,
  getPoliticalMap,
  getPoliticalMapCatalog,
} from '@helicraft/alhena';

import { initialViewport } from './viewport';

const MAX_ZOOM = 12;
const DEFAULT_ZOOM = 3;
const COORDINATE_LIMIT = 29_999_984;
const mapSearch = z.object({
  world: z.uuid().optional(),
  state: z.uuid().optional(),
  x: z.coerce.number().min(-COORDINATE_LIMIT).max(COORDINATE_LIMIT).default(0),
  z: z.coerce.number().min(-COORDINATE_LIMIT).max(COORDINATE_LIMIT).default(0),
  zoom: z.coerce.number().int().min(0).max(MAX_ZOOM).default(DEFAULT_ZOOM),
});
const loadPoliticalMap = createServerFn({ method: 'GET' })
  .validator(mapSearch)
  .handler(async ({ data }) => {
    const client = createClient({
      baseUrl: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      credentials: 'omit',
    });
    const [site, worlds] = await Promise.all([
      getSite({ client, throwOnError: true }),
      listSpatialWorlds({ client, throwOnError: false }).catch(() => null),
    ]);
    const available = worlds?.data?.items ?? [];
    const world =
      data.world === undefined
        ? available.find((item) => item.dimension === 'minecraft:overworld')
        : available.find((item) => item.id === data.world);
    const bounds = initialViewport([data.x, data.z], data.zoom, world?.maxZoom ?? DEFAULT_ZOOM);
    const catalog = world
      ? await getPoliticalMapCatalog({ client, path: { id: world.id }, throwOnError: false }).catch(
          () => null,
        )
      : null;
    const map = world
      ? await getPoliticalMap({
          client,
          path: { id: world.id },
          query: bounds,
          throwOnError: false,
        }).catch(() => null)
      : null;
    return {
      site: site.data,
      worlds: available,
      world: world ?? null,
      snapshot: map?.data ?? null,
      catalog: catalog?.data?.items ?? [],
      bounds,
    };
  });
type MapSearch = z.infer<typeof mapSearch>;
export { mapSearch, loadPoliticalMap, type MapSearch };
