import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { DomainError, HTTP } from '../errors';
import { json } from '../platform/routes';
import { worldRecord } from './store';
import { SPATIAL_LIMITS } from './contracts';
import { TileSourcesSchema } from './tile-sources';
import type { TileSource } from './tile-sources';

const TILE_PIXELS = 512;
const MAX_TILE_BYTES = 2_097_152;
const TILE_TIMEOUT_MS = 4000;
const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const PNG_HEADER_BYTES = 24;
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;
const MAX_ZOOM = 8;
const ZOOM_SCALE = 2;
const Errors = {
  404: json(z.object({ message: z.string() })),
  503: json(z.object({ message: z.string() })),
};
const TileParams = z.object({
  id: z.uuid(),
  zoom: z.coerce.number().int().min(0).max(MAX_ZOOM),
  x: z.coerce.number().int(),
  z: z.coerce.number().int(),
});
function joinChunks(chunks: readonly Uint8Array[], size: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
function validatePng(bytes: Uint8Array<ArrayBuffer>): void {
  const header = new DataView(bytes.buffer);
  if (
    bytes.length < PNG_HEADER_BYTES ||
    PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte) ||
    header.getUint32(PNG_WIDTH_OFFSET) !== TILE_PIXELS ||
    header.getUint32(PNG_HEIGHT_OFFSET) !== TILE_PIXELS
  ) {
    throw new DomainError(
      HTTP.unavailable,
      'MAP_TILE_INVALID',
      'Renderer did not return a valid squaremap tile',
    );
  }
}
async function readTile(response: Response): Promise<Uint8Array<ArrayBuffer>> {
  if (
    !response.ok ||
    !response.body ||
    Number(response.headers.get('content-length') ?? 0) > MAX_TILE_BYTES
  ) {
    await response.body?.cancel();
    throw new DomainError(
      HTTP.notFound,
      'MAP_TILE_UNAVAILABLE',
      'This surface tile is not rendered',
    );
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = response.body.getReader();
  try {
    for (;;) {
      // oxlint-disable-next-line no-await-in-loop -- Stream renderer output in order while enforcing its byte limit.
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      size += chunk.value.byteLength;
      if (size > MAX_TILE_BYTES) {
        // oxlint-disable-next-line no-await-in-loop -- Cancel this oversized stream immediately before accepting another chunk.
        await reader.cancel();
        throw new DomainError(
          HTTP.unavailable,
          'MAP_TILE_LIMIT',
          'Renderer tile exceeds the configured size',
        );
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = joinChunks(chunks, size);
  validatePng(bytes);
  return bytes;
}
async function fetchTile(url: URL): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const response = await fetch(url, {
      redirect: 'error',
      credentials: 'omit',
      signal: AbortSignal.timeout(TILE_TIMEOUT_MS),
    });
    return await readTile(response);
  } catch (error) {
    if (error instanceof DomainError) {
      throw error;
    }
    throw new DomainError(
      HTTP.unavailable,
      'MAP_SOURCE_UNAVAILABLE',
      'World renderer is temporarily unavailable',
    );
  }
}
async function tileResponse(
  db: Database['db'],
  sources: readonly TileSource[],
  input: z.infer<typeof TileParams>,
): Promise<Response> {
  const world = await db.transaction(
    async (transaction) => await worldRecord(transaction, input.id),
  );
  const source = sources.find((candidate) => candidate.backendId === world.backendId);
  const limit = Math.ceil(
    SPATIAL_LIMITS.coordinate / (TILE_PIXELS * ZOOM_SCALE ** (world.maxZoom - input.zoom)),
  );
  if (input.zoom > world.maxZoom || Math.abs(input.x) > limit || Math.abs(input.z) > limit) {
    throw new DomainError(
      HTTP.notFound,
      'MAP_TILE_UNAVAILABLE',
      'Tile coordinates are outside this world',
    );
  }
  if (!source) {
    throw new DomainError(
      HTTP.unavailable,
      'MAP_SOURCE_UNAVAILABLE',
      'This world map is not connected',
    );
  }
  const url = new URL(
    `/tiles/${world.tileKey}/${input.zoom}/${input.x}_${input.z}.png`,
    source.origin,
  );
  const bytes = await fetchTile(url);
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=15',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
function tileRoutes(
  db: Database['db'] | undefined,
  rawSources: readonly TileSource[],
): OpenAPIHono {
  const sources = TileSourcesSchema.parse(rawSources);
  const app = new OpenAPIHono();
  app.openapi(
    createRoute({
      method: 'get',
      path: '/public/spatial/worlds/{id}/tiles/{zoom}/{x}/{z}',
      operationId: 'getSquaremapTile',
      request: { params: TileParams },
      responses: {
        200: {
          description: 'A real squaremap surface tile',
          content: { 'image/png': { schema: z.string().openapi({ format: 'binary' }) } },
        },
        ...Errors,
      },
    }),
    async (context) => {
      if (!db) {
        throw new DomainError(
          HTTP.unavailable,
          'SPATIAL_UNAVAILABLE',
          'Spatial service is unavailable',
        );
      }
      return await tileResponse(db, sources, context.req.valid('param'));
    },
  );
  return app;
}
export { tileRoutes };
