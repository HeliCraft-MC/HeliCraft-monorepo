import { z } from 'zod';
import type { TerritoryGeometry } from '@helicraft/alhena';
import type { FlatGeometry } from '@helicraft/atria';

const COORDINATE_LIMIT = 29_999_984;
const MAX_VERTICES = 4096;
const MIN_RING_VERTICES = 4;
const LAST_VERTEX = -1;
const coordinate = z.number().min(-COORDINATE_LIMIT).max(COORDINATE_LIMIT);
const ring = z
  .array(z.tuple([coordinate, coordinate]))
  .min(MIN_RING_VERTICES)
  .max(MAX_VERTICES);
const polygon = z.array(ring).min(1);
const geometryInput = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('Polygon'), coordinates: polygon }).strict(),
    z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygon).min(1) }).strict(),
  ])
  .superRefine((geometry, context) => {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    let vertices = 0;
    for (const component of polygons) {
      for (const boundary of component) {
        vertices += boundary.length;
        const [first] = boundary;
        const last = boundary.at(LAST_VERTEX);
        if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
          context.addIssue({
            code: 'custom',
            message: 'Close every ring: first and last X/Z must match.',
          });
        }
      }
    }
    if (vertices > MAX_VERTICES) {
      context.addIssue({ code: 'custom', message: 'The geometry exceeds 4096 vertices.' });
    }
  });
function apiGeometry(value: FlatGeometry | null): TerritoryGeometry | null {
  return value === null ? null : geometryInput.parse(value);
}
export { geometryInput, apiGeometry };
