/** Local planar coordinates; the host defines their units and world identity. */
type FlatPoint = readonly [number, number];
type FlatRing = readonly FlatPoint[];
type FlatPolygon = readonly FlatRing[];
type FlatGeometry =
  | Readonly<{ type: 'Polygon'; coordinates: FlatPolygon }>
  | Readonly<{ type: 'MultiPolygon'; coordinates: readonly FlatPolygon[] }>;
type FlatMapMode = 'view' | 'draw' | 'edit' | 'cut' | 'remove';
interface FlatMapShape {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly geometry: FlatGeometry;
  readonly selected?: boolean;
}
interface FlatMapBounds {
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
}
interface FlatMapProps {
  readonly label: string;
  readonly loadingLabel: string;
  readonly errorLabel: string;
  readonly tileErrorLabel: string;
  readonly tileUrl: string;
  readonly attribution: string;
  readonly showNames?: boolean;
  readonly showBoundaries?: boolean;
  readonly showTiles?: boolean;
  readonly maxNativeZoom: number;
  readonly extraZoom: number;
  readonly center: FlatPoint;
  readonly zoom: number;
  readonly shapes: readonly FlatMapShape[];
  readonly geometry?: FlatGeometry | null;
  readonly mode?: FlatMapMode;
  readonly locale?: 'en' | 'ru';
  readonly onChange?: (geometry: FlatGeometry | null) => void;
  readonly onModeChange?: (mode: FlatMapMode) => void;
  readonly onSelect?: (id: string) => void;
  readonly onBounds?: (bounds: FlatMapBounds) => void;
  readonly onViewChange?: (center: FlatPoint, zoom: number) => void;
  readonly onPoint?: (point: FlatPoint) => void;
}
const DEFAULT_NATIVE_ZOOM = 3;
const SCALE_BASE = 2;
// Squaremap uses 512px tiles and CRS.Simple, with north at negative Z.
function flatToMap(point: FlatPoint, maxNativeZoom = DEFAULT_NATIVE_ZOOM): FlatPoint {
  const scale = SCALE_BASE ** maxNativeZoom;
  return [-point[1] / scale, point[0] / scale];
}
function mapToFlat(point: FlatPoint, maxNativeZoom = DEFAULT_NATIVE_ZOOM): FlatPoint {
  const scale = SCALE_BASE ** maxNativeZoom;
  return [point[1] * scale, -point[0] * scale];
}
export { flatToMap, mapToFlat };
export type {
  FlatPoint,
  FlatRing,
  FlatPolygon,
  FlatGeometry,
  FlatMapMode,
  FlatMapShape,
  FlatMapProps,
  FlatMapBounds,
};
