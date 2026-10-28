// oxlint-disable import/max-dependencies -- Public map composes cookie-free SSR content, shared renderer and focused exploration controls.
import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, Badge } from '@helicraft/atria';
import type { FlatPoint } from '@helicraft/atria';
import { Compass, Map, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { MapControls } from './map-controls';
import type { loadPoliticalMap, MapSearch } from './public-data';
import styles from './spatial.module.scss';
import type { MapLayers } from './layer-controls';
import { PublicMapExplorer } from './public-map-explorer';
import { CoordinateReadout } from './coordinate-readout';
import { ViewportMap } from './viewport-map';

type MapData = Awaited<ReturnType<typeof loadPoliticalMap>>;
function PublicPoliticalMap({
  data,
  search,
}: Readonly<{ data: MapData; search: MapSearch }>): ReactElement {
  const { locale } = useTranslation();
  const [point, setPoint] = useState<FlatPoint | null>(null);
  const [selected, setSelected] = useState(search.state);
  const [layers, setLayers] = useState<MapLayers>({ tiles: true, boundaries: true, names: true });
  const [view, setView] = useState({ x: search.x, z: search.z, zoom: search.zoom });
  const handleViewChange = useCallback((position: FlatPoint, zoom: number): void => {
    setView({ x: position[0], z: position[1], zoom });
  }, []);
  const viewSearch = useMemo(
    () => ({ ...search, ...view, state: selected }),
    [search, view, selected],
  );
  const select = useCallback((id: string | undefined): void => {
    setSelected(id);
  }, []);
  const center = useMemo(() => [search.x, search.z] as const, [search.x, search.z]);
  return (
    <main id="main-content" className={styles.atlas}>
      <header className={styles.atlasHeader}>
        <div>
          <p className={styles.eyebrow}>
            <Compass size={15} aria-hidden="true" />
            {uiText(locale, 'Атлас мира', 'World atlas')}
          </p>
          <h1>{uiText(locale, 'Политическая карта', 'Political map')}</h1>
          <p className={styles.subtitle}>
            {uiText(
              locale,
              'Исследуйте мир и границы государств.',
              'Explore the world and its state boundaries.',
            )}
          </p>
        </div>
        <Badge>
          <ShieldCheck size={14} aria-hidden="true" />
          {uiText(locale, 'Только утверждённые границы', 'Ratified boundaries only')}
        </Badge>
      </header>
      {!data.world && (
        <section className={styles.mapEmpty}>
          <Map size={32} aria-hidden="true" />
          <h2>{uiText(locale, 'Карта пока недоступна', 'The map is not available yet')}</h2>
          <p>
            {uiText(
              locale,
              'Мир появится здесь после подключения игрового сервера. Если вы открыли сохранённую ссылку, попробуйте выбрать другой мир.',
              'The world will appear when the game server connects. If you followed a saved link, try another world.',
            )}
          </p>
          {data.worlds.length > 0 && <MapControls worlds={data.worlds} search={search} />}
          <a href={`/map?lang=${locale}`}>
            {uiText(locale, 'Открыть основной мир', 'Open the primary world')}
          </a>
        </section>
      )}
      {data.world && !data.snapshot && (
        <Alert tone="info">
          <strong>
            {uiText(locale, 'Карта временно недоступна', 'Map temporarily unavailable')}
          </strong>
          <p>
            {uiText(
              locale,
              'Не удалось получить границы мира. Повторите попытку через некоторое время.',
              'We could not load the world boundaries. Please try again in a moment.',
            )}
          </p>
          <a href={`/map?world=${data.world.id}&lang=${locale}`}>
            {uiText(locale, 'Повторить загрузку', 'Try again')}
          </a>
        </Alert>
      )}
      {data.world && data.snapshot && (
        <div className={styles.atlasWorkspace}>
          <section
            className={styles.mapStage}
            aria-label={uiText(locale, 'Обзор мира', 'World overview')}
          >
            <div className={styles.mapTopbar}>
              <span>
                <span className={styles.worldDot} />
                {displayText(data.world.name, locale)}
              </span>
              <span className={styles.mapHint}>
                {uiText(
                  locale,
                  'Перемещайте карту · + / − масштаб',
                  'Drag to explore · + / − to zoom',
                )}
              </span>
            </div>
            <ViewportMap
              key={data.world.id}
              world={data.world}
              initial={data.snapshot}
              bounds={data.bounds}
              selected={selected}
              center={center}
              zoom={search.zoom}
              onSelect={select}
              onPoint={setPoint}
              onViewChange={handleViewChange}
              showNames={layers.names}
              showBoundaries={layers.boundaries}
              showTiles={layers.tiles}
            />
            <div className={styles.mapBottomBar}>
              {point ? (
                <CoordinateReadout point={point} />
              ) : (
                <span>
                  {uiText(
                    locale,
                    'Нажмите на карту, чтобы узнать координаты',
                    'Click the map to read coordinates',
                  )}
                </span>
              )}
              <span>
                {uiText(locale, 'Позиции игроков скрыты', 'Player positions are private')}
              </span>
            </div>
          </section>
          <PublicMapExplorer
            catalog={data.catalog}
            worldId={data.world.id}
            worlds={data.worlds}
            search={viewSearch}
            selected={selected}
            onSelect={select}
            layers={layers}
            onLayers={setLayers}
          />
        </div>
      )}
    </main>
  );
}
export { PublicPoliticalMap };
