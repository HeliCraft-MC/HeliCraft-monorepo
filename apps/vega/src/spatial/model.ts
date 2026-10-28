import type { TerritoryGeometry } from '@helicraft/alhena';
import type { FlatPoint } from '@helicraft/atria';

const DEFAULT_NATIVE_ZOOM = 3;
const COORDINATE_PRECISION = 2;
const MIDPOINT_DIVISOR = 2;
function geometryCenter(geometry: TerritoryGeometry | null): FlatPoint {
  if (geometry === null) {
    return [0, 0];
  }
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const polygon of polygons) {
    for (const [x, z] of polygon[0] ?? []) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  return Number.isFinite(minX)
    ? [(minX + maxX) / MIDPOINT_DIVISOR, (minZ + maxZ) / MIDPOINT_DIVISOR]
    : [0, 0];
}
export { DEFAULT_NATIVE_ZOOM, COORDINATE_PRECISION, geometryCenter };
