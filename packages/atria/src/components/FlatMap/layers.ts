import Leaflet from 'leaflet';
import type { FlatGeometry, FlatPoint, FlatPolygon } from './model';
import { flatToMap, mapToFlat } from './model';

const DRAFT_WEIGHT = 3;
const DRAFT_FILL_OPACITY = 0.15;

function polygonLayers(geometry: FlatGeometry, zoom: number, editable: boolean): Leaflet.Polygon[] {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((polygon) =>
    Leaflet.polygon(
      polygon.map((ring) =>
        ring.map((point) => {
          const [lat, lng] = flatToMap(point, zoom);
          return Leaflet.latLng(lat, lng);
        }),
      ),
      {
        pmIgnore: !editable,
        color: '#fbbf24',
        weight: DRAFT_WEIGHT,
        fillOpacity: DRAFT_FILL_OPACITY,
      },
    ),
  );
}
function localPoint(position: readonly number[], zoom: number): FlatPoint {
  const [lng, lat] = position;
  if (lng === undefined || lat === undefined || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new Error('Finite planar coordinates required');
  }
  return mapToFlat([lat, lng], zoom);
}
function readGeometry(group: Leaflet.FeatureGroup, zoom: number): FlatGeometry | null {
  const polygons: FlatPolygon[] = [];
  function read(layer: Leaflet.Layer): void {
    if (layer instanceof Leaflet.Polygon) {
      const { geometry } = layer.toGeoJSON(false);
      const components =
        geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      for (const polygon of components) {
        polygons.push(polygon.map((ring) => ring.map((point) => localPoint(point, zoom))));
      }
    } else if (layer instanceof Leaflet.LayerGroup) {
      layer.eachLayer(read);
    }
  }
  group.eachLayer(read);
  const [first] = polygons;
  if (!first) {
    return null;
  }
  return polygons.length === 1
    ? { type: 'Polygon', coordinates: first }
    : { type: 'MultiPolygon', coordinates: polygons };
}
function addEditable(group: Leaflet.FeatureGroup, layer: Leaflet.Layer, changed: () => void): void {
  if (layer instanceof Leaflet.Polygon) {
    layer.setStyle({
      color: '#fbbf24',
      fillColor: '#fbbf24',
      weight: DRAFT_WEIGHT,
      fillOpacity: DRAFT_FILL_OPACITY,
    });
    layer.options.pmIgnore = false;
    Leaflet.PM.reInitLayer(layer);
    layer.on('pm:edit', changed);
    group.addLayer(layer);
  } else if (layer instanceof Leaflet.LayerGroup) {
    layer.eachLayer((child) => {
      addEditable(group, child, changed);
    });
  }
}
export { polygonLayers, readGeometry, addEditable };
