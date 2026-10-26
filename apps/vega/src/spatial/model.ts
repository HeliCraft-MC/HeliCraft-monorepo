import type { TerritoryGeometry } from '@helicraft/alhena';
import type { FlatPoint } from '@helicraft/atria';

const DEFAULT_NATIVE_ZOOM = 3;
const COORDINATE_PRECISION = 2;
function geometryCenter(geometry: TerritoryGeometry | null): FlatPoint {
  if (geometry === null) {
    return [0, 0];
  }
  if (geometry.type === 'Polygon') {
    return geometry.coordinates[0]?.[0] ?? [0, 0];
  }
  return geometry.coordinates[0]?.[0]?.[0] ?? [0, 0];
}
export { DEFAULT_NATIVE_ZOOM, COORDINATE_PRECISION, geometryCenter };
