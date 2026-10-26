import { z } from 'zod';

const MAX_TILE_SOURCES = 16;
const MAX_BACKEND_ID = 64;
const TileSourceSchema = z
  .object({
    backendId: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/u)
      .max(MAX_BACKEND_ID),
    origin: z.url().refine((value) => {
      const origin = new URL(value);
      const local = new Set(['localhost', '127.0.0.1', '[::1]', 'deneb']);
      return (
        origin.username === '' &&
        origin.password === '' &&
        origin.search === '' &&
        origin.hash === '' &&
        origin.pathname === '/' &&
        (origin.protocol === 'https:' ||
          (origin.protocol === 'http:' && local.has(origin.hostname)))
      );
    }, 'Tile source must be an HTTPS origin or the local/private Deneb origin'),
  })
  .strict();
const TileSourcesSchema = z
  .array(TileSourceSchema)
  .max(MAX_TILE_SOURCES)
  .refine(
    (sources) => new Set(sources.map((source) => source.backendId)).size === sources.length,
    'Each tile backend must have one configured origin',
  );
type TileSource = z.infer<typeof TileSourceSchema>;
export { TileSourcesSchema, type TileSource };
