// oxlint-disable import/max-dependencies -- Public map composition combines cookie-free SSR metadata, shared map, layer controls and immutable published history.
import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { MapControls } from './map-controls';
import type { loadPoliticalMap, MapSearch } from './public-data';
import styles from './spatial.module.scss';
import { TerritoryLegendItem } from './legend-item';
import { MapLayerControls } from './layer-controls';
import type { MapLayers } from './layer-controls';
import { TerritoryHistory } from './history';
import { CoordinateReadout } from './coordinate-readout';
import { ViewportMap } from './viewport-map';
import type { FlatPoint } from '@helicraft/atria';

type MapData = Awaited<ReturnType<typeof loadPoliticalMap>>;
function PublicPoliticalMap({
  data,
  search,
}: Readonly<{ data: MapData; search: MapSearch }>): ReactElement {
  const { locale } = useTranslation();
  const [point, setPoint] = useState<FlatPoint | null>(null);
  const [selected, setSelected] = useState(search.state);
  const [layers, setLayers] = useState<MapLayers>({ tiles: true, boundaries: true, names: true });
  const filter = useCallback((id: string | undefined): void => {
    setSelected(id);
  }, []);
  const select = useCallback((id: string): void => {
    setSelected(id);
  }, []);
  const center = useMemo(() => [search.x, search.z] as const, [search.x, search.z]);
  const active = data.catalog.find((item) => item.stateId === selected);
  return (
    <main id="main-content">
      <PageContainer>
        <section className={styles.page}>
          <header>
            <h1>{uiText(locale, 'Политическая карта', 'Political map')}</h1>
            <p>
              {uiText(
                locale,
                'Реальный мир Minecraft и утверждённые государственные границы. Север — отрицательный Z. Позиции игроков не публикуются.',
                'The real Minecraft world and ratified state boundaries. North is negative Z. Player positions are private.',
              )}
            </p>
          </header>
          {data.worlds.length > 0 && (
            <MapControls worlds={data.worlds} search={search} worldId={data.world?.id} />
          )}
          {!data.world && (
            <p>
              {uiText(
                locale,
                'Выбранный мир недоступен. Обычный мир подключается автоматически после запуска Minecraft-сервера.',
                'This world is unavailable. The primary Overworld connects automatically when Minecraft starts.',
              )}
            </p>
          )}
          {data.world && !data.snapshot && (
            <output>
              {uiText(
                locale,
                'Границы временно недоступны. Повторите запрос позже.',
                'Boundaries are temporarily unavailable. Try again later.',
              )}
            </output>
          )}
          {data.world && data.snapshot && (
            <div className={styles.layout}>
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
                showNames={layers.names}
                showBoundaries={layers.boundaries}
                showTiles={layers.tiles}
              />
              <aside
                className={styles.panel}
                aria-label={uiText(locale, 'Государственные территории', 'State territories')}
              >
                <h2>{uiText(locale, 'Государства', 'States')}</h2>
                <CoordinateReadout point={point} />
                <MapLayerControls
                  layers={layers}
                  onLayers={setLayers}
                  territories={data.catalog}
                  selected={selected}
                  onSelect={filter}
                />
                {data.catalog.length === 0 && (
                  <p>
                    {uiText(
                      locale,
                      'Утверждённых территорий пока нет.',
                      'No territories have been ratified yet.',
                    )}
                  </p>
                )}
                <ul className={styles.legend}>
                  {data.catalog.map((territory) => (
                    <TerritoryLegendItem key={territory.stateId} territory={territory} />
                  ))}
                </ul>
                {active && (
                  <TerritoryHistory
                    key={active.stateId}
                    worldId={data.world.id}
                    stateId={active.stateId}
                  />
                )}
                {active && (
                  <output>
                    {uiText(locale, 'Выбрано', 'Selected')}: {displayText(active.name, locale)}{' '}
                    <a
                      href={`/map?world=${data.world.id}&state=${active.stateId}&x=${search.x}&z=${search.z}&zoom=${search.zoom}&lang=${locale}`}
                    >
                      {uiText(locale, 'Ссылка на территорию', 'Territory link')}
                    </a>
                  </output>
                )}
                <p>
                  {uiText(
                    locale,
                    'Независимая территория — вне утверждённых полигонов, внутри отверстий и точно на общей границе. Государственная юрисдикция не даёт права собственности на блоки.',
                    'Wilderness lies outside ratified polygons, inside holes and exactly on shared edges. State jurisdiction does not grant block ownership.',
                  )}
                </p>
                <p>
                  {uiText(
                    locale,
                    'Территории редактируются в панели государства.',
                    'Edit territories in state management.',
                  )}
                </p>
              </aside>
            </div>
          )}
        </section>
      </PageContainer>
    </main>
  );
}
export { PublicPoliticalMap };
