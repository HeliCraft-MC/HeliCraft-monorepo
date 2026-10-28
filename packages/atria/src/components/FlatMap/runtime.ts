import Leaflet from 'leaflet';
// oxlint-disable-next-line import/no-unassigned-import -- Geoman installs its supported Leaflet extension before map creation.
import '@geoman-io/leaflet-geoman-free';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { flatToMap, mapToFlat } from './model';
import type { FlatMapMode, FlatMapProps } from './model';
import { polygonLayers, readGeometry, addEditable } from './layers';

const SELECTED_WEIGHT = 4;
const BOUNDARY_WEIGHT = 2;
const PUBLISHED_FILL_OPACITY = 0.15;
const COORDINATE_RADIUS = 6;
interface FlatMapRuntime {
  readonly update: (props: FlatMapProps) => void;
  readonly destroy: () => void;
}
function setMode(map: Leaflet.Map, mode: FlatMapMode): void {
  map.pm.disableDraw();
  map.pm.disableGlobalEditMode();
  map.pm.disableGlobalCutMode();
  map.pm.disableGlobalRemovalMode();
  const options = { allowSelfIntersection: false, snappable: false, continueDrawing: false };
  if (mode === 'draw') {
    map.pm.enableDraw('Polygon', options);
  } else if (mode === 'edit') {
    map.pm.enableGlobalEditMode(options);
  } else if (mode === 'cut') {
    map.pm.enableGlobalCutMode(options);
  } else if (mode === 'remove') {
    map.pm.enableGlobalRemovalMode();
  }
}
function renderShapes(group: Leaflet.FeatureGroup, props: FlatMapProps): void {
  group.clearLayers();
  for (const shape of props.shapes) {
    for (const layer of polygonLayers(shape.geometry, props.maxNativeZoom, false)) {
      layer.setStyle({
        color: shape.color,
        fillColor: shape.color,
        weight: shape.selected === true ? SELECTED_WEIGHT : BOUNDARY_WEIGHT,
        opacity: props.showBoundaries === false ? 0 : 1,
        fillOpacity: props.showBoundaries === false ? 0 : PUBLISHED_FILL_OPACITY,
      });
      const text = document.createElement('span');
      text.textContent = shape.name;
      if (props.showNames !== false) {
        layer.bindTooltip(text, { permanent: true, direction: 'center' });
      }
      layer.on('click', () => props.onSelect?.(shape.id));
      group.addLayer(layer);
    }
  }
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- One browser map owns its renderer, disposable event listeners and controlled geometry reconciliation.
function createFlatMap(
  container: HTMLElement,
  initial: FlatMapProps,
  tileError: (failed: boolean) => void,
): FlatMapRuntime {
  Leaflet.PM.setOptIn(true);
  // oxlint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument -- Leaflet.map is a DOM map factory, not Array.prototype.map.
  const map = Leaflet.map(container, {
    crs: Leaflet.CRS.Simple,
    minZoom: 0,
    maxZoom: initial.maxNativeZoom + initial.extraZoom,
    pmIgnore: false,
    zoomControl: false,
    zoomAnimation: !globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
  Leaflet.control
    .zoom({
      position: 'topleft',
      zoomInTitle: initial.locale === 'ru' ? 'Приблизить' : 'Zoom in',
      zoomOutTitle: initial.locale === 'ru' ? 'Отдалить' : 'Zoom out',
    })
    .addTo(map);
  map.pm.setLang(initial.locale ?? 'en');
  map.pm.setGlobalOptions({
    allowSelfIntersection: false,
    snappable: false,
    exitModeOnEscape: true,
  });
  const tiles = Leaflet.tileLayer(initial.tileUrl, {
    tileSize: 512,
    maxNativeZoom: initial.maxNativeZoom,
    maxZoom: initial.maxNativeZoom + initial.extraZoom,
    attribution: initial.attribution,
    noWrap: true,
  }).addTo(map);
  tiles.on('tileerror', () => {
    tileError(true);
  });
  tiles.on('tileload', () => {
    tileError(false);
  });
  const published = Leaflet.featureGroup().addTo(map);
  const draft = Leaflet.featureGroup().addTo(map);
  const coordinateMarker = Leaflet.circleMarker([0, 0], {
    radius: COORDINATE_RADIUS,
    pmIgnore: true,
    interactive: false,
    color: '#fafafa',
    weight: BOUNDARY_WEIGHT,
    fillOpacity: 0,
  }).addTo(map);
  let props = initial;
  let disposed = false;
  let geometryKey = '';
  let shapesKey = '';
  let viewKey = '';
  let mode: FlatMapMode | undefined = undefined;
  let reconcilingMode = false;
  const changed = (): void => {
    const geometry = readGeometry(draft, props.maxNativeZoom);
    geometryKey = JSON.stringify(geometry);
    props.onChange?.(geometry);
  };
  map.on('pm:create', (event) => {
    addEditable(draft, event.layer, changed);
    changed();
    props.onModeChange?.('view');
  });
  map.on('pm:cut', (event) => {
    draft.removeLayer(event.originalLayer);
    addEditable(draft, event.layer, changed);
    changed();
    props.onModeChange?.('view');
  });
  map.on('pm:globaldrawmodetoggled', (event) => {
    if (!reconcilingMode && !event.enabled && props.mode === 'draw') {
      props.onModeChange?.('view');
    }
  });
  map.on('pm:globalcutmodetoggled', (event) => {
    if (!reconcilingMode && !event.enabled && props.mode === 'cut') {
      props.onModeChange?.('view');
    }
  });
  map.on('pm:globaleditmodetoggled', (event) => {
    if (!reconcilingMode && !event.enabled && props.mode === 'edit') {
      props.onModeChange?.('view');
    }
  });
  map.on('pm:globalremovalmodetoggled', (event) => {
    if (!reconcilingMode && !event.enabled && props.mode === 'remove') {
      props.onModeChange?.('view');
    }
  });
  map.on('pm:remove', (event) => {
    draft.removeLayer(event.layer);
    changed();
  });
  map.on('click', (event) => {
    props.onPoint?.(mapToFlat([event.latlng.lat, event.latlng.lng], props.maxNativeZoom));
  });
  // oxlint-disable-next-line max-statements -- Reconcile independent viewport, published layers, draft geometry and editing mode without recreating the map.
  function update(next: FlatMapProps): void {
    props = next;
    if (next.showTiles === false) {
      map.removeLayer(tiles);
    } else if (!map.hasLayer(tiles)) {
      tiles.addTo(map);
    }
    if (next.tileUrl !== initial.tileUrl) {
      tiles.setUrl(next.tileUrl);
    }
    const nextView = JSON.stringify([next.center, next.zoom]);
    if (nextView !== viewKey) {
      const [lat, lng] = flatToMap(next.center, next.maxNativeZoom);
      map.setView([lat, lng], next.zoom, { animate: false });
      coordinateMarker.setLatLng([lat, lng]);
      viewKey = nextView;
    }
    const nextShapes = JSON.stringify([next.shapes, next.showBoundaries, next.showNames]);
    if (nextShapes !== shapesKey) {
      renderShapes(published, next);
      shapesKey = nextShapes;
    }
    const nextGeometry = JSON.stringify(next.geometry ?? null);
    // Geoman emits disabled events during its own disable/enable reconciliation too.
    reconcilingMode = true;
    try {
      if (nextGeometry !== geometryKey) {
        draft.clearLayers();
        if (next.geometry) {
          for (const layer of polygonLayers(next.geometry, next.maxNativeZoom, true)) {
            addEditable(draft, layer, changed);
          }
        }
        geometryKey = nextGeometry;
        mode = undefined;
      }
      if (mode !== (next.mode ?? 'view')) {
        mode = next.mode ?? 'view';
        setMode(map, mode);
      }
    } finally {
      reconcilingMode = false;
    }
  }
  const reportBounds = (): void => {
    if (disposed) {
      return;
    }
    const center = map.getCenter();
    props.onViewChange?.(mapToFlat([center.lat, center.lng], props.maxNativeZoom), map.getZoom());
    const bounds = map.getBounds();
    const [minX, minZ] = mapToFlat([bounds.getNorth(), bounds.getWest()], props.maxNativeZoom);
    const [maxX, maxZ] = mapToFlat([bounds.getSouth(), bounds.getEast()], props.maxNativeZoom);
    props.onBounds?.({ minX, minZ, maxX, maxZ });
  };
  map.on('moveend resize', reportBounds);
  update(initial);
  const observer = new ResizeObserver(() => {
    if (!disposed) {
      map.invalidateSize({ animate: false });
    }
  });
  observer.observe(container);
  return {
    update,
    destroy: (): void => {
      disposed = true;
      observer.disconnect();
      map.off('moveend resize', reportBounds);
      map.remove();
    },
  };
}
export { createFlatMap };
export type { FlatMapRuntime };
