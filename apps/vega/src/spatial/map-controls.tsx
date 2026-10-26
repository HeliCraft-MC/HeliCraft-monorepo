import type { ReactElement } from 'react';
import { Button, FormField, Select, TextField } from '@helicraft/atria';
import type { SpatialWorld } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import type { MapSearch } from './public-data';
import styles from './spatial.module.scss';

function MapControls({
  worlds,
  search,
  worldId,
}: Readonly<{
  worlds: readonly SpatialWorld[];
  search: MapSearch;
  worldId?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  return (
    <form action="/map" method="get" className={styles.controls}>
      <input type="hidden" name="lang" value={locale} />
      <FormField label={uiText(locale, 'Мир', 'World')} htmlFor="map-world">
        <Select id="map-world" name="world" defaultValue={worldId}>
          {worlds.map((world) => (
            <option key={world.id} value={world.id}>
              {displayText(world.name, locale)} · {world.dimension}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="X" htmlFor="map-x">
        <TextField id="map-x" name="x" type="number" defaultValue={search.x} />
      </FormField>
      <FormField label="Z" htmlFor="map-z">
        <TextField id="map-z" name="z" type="number" defaultValue={search.z} />
      </FormField>
      <FormField label={uiText(locale, 'Масштаб', 'Zoom')} htmlFor="map-zoom">
        <TextField
          id="map-zoom"
          name="zoom"
          type="number"
          min={0}
          max={12}
          defaultValue={search.zoom}
        />
      </FormField>
      <Button type="submit">{uiText(locale, 'Перейти', 'Go to coordinates')}</Button>
    </form>
  );
}
export { MapControls };
