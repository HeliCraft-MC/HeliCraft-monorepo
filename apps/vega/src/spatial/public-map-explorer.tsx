// oxlint-disable import/max-dependencies -- Exploration combines localized catalog entries, public history and shared map controls.
import type { ReactElement } from 'react';
import { ArrowUpRight, Map } from 'lucide-react';
import type { PublicTerritorySummary, SpatialWorld } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { TerritoryLegendItem } from './legend-item';
import { MapLayerControls } from './layer-controls';
import type { MapLayers } from './layer-controls';
import { TerritoryHistory } from './history';
import { MapHelp } from './map-help';
import type { MapSearch } from './public-data';
import styles from './spatial.module.scss';

function PublicMapExplorer({
  catalog,
  worldId,
  worlds,
  search,
  selected,
  onSelect,
  layers,
  onLayers,
}: Readonly<{
  catalog: readonly PublicTerritorySummary[];
  worldId: string;
  worlds: readonly SpatialWorld[];
  search: MapSearch;
  selected: string | undefined;
  onSelect: (id: string | undefined) => void;
  layers: MapLayers;
  onLayers: (layers: MapLayers) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const active = catalog.find((item) => item.stateId === selected);
  return (
    <aside
      className={styles.atlasSidebar}
      aria-label={uiText(locale, 'Государственные территории', 'State territories')}
    >
      <div className={styles.explorerHeading}>
        <div>
          <p className={styles.eyebrow}>{uiText(locale, 'Территории', 'Territories')}</p>
          <h2>{uiText(locale, 'Государства', 'States')}</h2>
        </div>
        <span className={styles.count}>{catalog.length}</span>
      </div>
      <MapLayerControls
        layers={layers}
        onLayers={onLayers}
        territories={catalog}
        selected={selected}
        onSelect={onSelect}
      />
      {catalog.length === 0 ? (
        <div className={styles.catalogEmpty}>
          <Map size={24} aria-hidden="true" />
          <h3>{uiText(locale, 'Мир без границ', 'A world without borders')}</h3>
          <p>
            {uiText(
              locale,
              'Утверждённых территорий пока нет. Вы уже можете исследовать поверхность мира.',
              'No territories have been ratified yet. You can already explore the world terrain.',
            )}
          </p>
        </div>
      ) : (
        <ul className={styles.territoryList}>
          {catalog.map((territory) => (
            <TerritoryLegendItem
              key={territory.stateId}
              territory={territory}
              selected={selected === territory.stateId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
      {active && (
        <div className={styles.selection}>
          <p className={styles.eyebrow}>
            {uiText(locale, 'Выбранная территория', 'Selected territory')}
          </p>
          <h3>{displayText(active.name, locale)}</h3>
          <a
            href={`/map?world=${worldId}&state=${active.stateId}&x=${search.x}&z=${search.z}&zoom=${search.zoom}&lang=${locale}`}
          >
            {uiText(locale, 'Ссылка на территорию', 'Territory link')}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <TerritoryHistory key={active.stateId} worldId={worldId} stateId={active.stateId} />
        </div>
      )}
      <MapHelp worlds={worlds} worldId={worldId} search={search} />
    </aside>
  );
}
export { PublicMapExplorer };
