import type { FlatMapBounds } from '@helicraft/atria';

const COORDINATE_LIMIT = 29_999_984;
const INITIAL_HALF_VIEW = 1024;
const ZOOM_BASE = 2;
const PADDING = 0.25;
function boundedViewport(bounds: FlatMapBounds): FlatMapBounds {
  const marginX = (bounds.maxX - bounds.minX) * PADDING;
  const marginZ = (bounds.maxZ - bounds.minZ) * PADDING;
  const minX = Math.min(
    COORDINATE_LIMIT - 1,
    Math.max(-COORDINATE_LIMIT, Math.floor(bounds.minX - marginX)),
  );
  const minZ = Math.min(
    COORDINATE_LIMIT - 1,
    Math.max(-COORDINATE_LIMIT, Math.floor(bounds.minZ - marginZ)),
  );
  return {
    minX,
    minZ,
    maxX: Math.max(minX + 1, Math.min(COORDINATE_LIMIT, Math.ceil(bounds.maxX + marginX))),
    maxZ: Math.max(minZ + 1, Math.min(COORDINATE_LIMIT, Math.ceil(bounds.maxZ + marginZ))),
  };
}
function initialViewport(
  center: readonly [number, number],
  zoom: number,
  nativeZoom: number,
): FlatMapBounds {
  const [x, z] = center;
  const radius = INITIAL_HALF_VIEW * ZOOM_BASE ** (nativeZoom - zoom);
  return boundedViewport({
    minX: x - radius,
    minZ: z - radius,
    maxX: x + radius,
    maxZ: z + radius,
  });
}
export { boundedViewport, initialViewport };
