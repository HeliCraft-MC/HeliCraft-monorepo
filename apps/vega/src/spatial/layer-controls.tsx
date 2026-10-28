import { useCallback } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { Checkbox, FormField, Select } from '@helicraft/atria';
import type { PublicTerritorySummary } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { Layers } from 'lucide-react';
import styles from './spatial.module.scss';

interface MapLayers {
  tiles: boolean;
  boundaries: boolean;
  names: boolean;
}
function MapLayerControls({
  layers,
  onLayers,
  territories,
  selected,
  onSelect,
}: Readonly<{
  layers: MapLayers;
  onLayers: (layers: MapLayers) => void;
  territories: readonly PublicTerritorySummary[];
  selected: string | undefined;
  onSelect: (id: string | undefined) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { name, checked } = event.currentTarget;
      if (name === 'tiles' || name === 'boundaries' || name === 'names') {
        onLayers({ ...layers, [name]: checked });
      }
    },
    [layers, onLayers],
  );
  const select = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onSelect(event.currentTarget.value || undefined);
    },
    [onSelect],
  );
  return (
    <>
      <FormField
        label={uiText(locale, 'Выбрать государство', 'Select state')}
        htmlFor="political-state"
      >
        <Select id="political-state" value={selected ?? ''} onChange={select}>
          <option value="">{uiText(locale, 'Все государства', 'All states')}</option>
          {territories.map((item) => (
            <option key={item.stateId} value={item.stateId}>
              {displayText(item.name, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      <details className={styles.mapDisclosure}>
        <summary>
          <Layers size={16} aria-hidden="true" />
          {uiText(locale, 'Слои карты', 'Map layers')}
        </summary>
        <div className={styles.layerOptions}>
          <Checkbox
            name="tiles"
            checked={layers.tiles}
            onChange={change}
            label={uiText(locale, 'Поверхность Minecraft', 'Minecraft terrain')}
          />
          <Checkbox
            name="boundaries"
            checked={layers.boundaries}
            onChange={change}
            label={uiText(locale, 'Государственные границы', 'State boundaries')}
          />
          <Checkbox
            name="names"
            checked={layers.names}
            onChange={change}
            label={uiText(locale, 'Названия государств', 'State names')}
          />
        </div>
      </details>
    </>
  );
}
export { MapLayerControls, type MapLayers };
