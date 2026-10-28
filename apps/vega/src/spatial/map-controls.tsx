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
              {displayText(world.name, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="X" htmlFor="map-x">
        <TextField
          id="map-x"
          name="x"
          type="number"
          min={-29_999_984}
          max={29_999_984}
          defaultValue={search.x}
        />
      </FormField>
      <FormField label="Z" htmlFor="map-z">
        <TextField
          id="map-z"
          name="z"
          type="number"
          min={-29_999_984}
          max={29_999_984}
          defaultValue={search.z}
        />
      </FormField>
      <input type="hidden" name="zoom" value={search.zoom} />
      {search.state !== undefined && <input type="hidden" name="state" value={search.state} />}
      <Button type="submit">{uiText(locale, 'Перейти', 'Go to coordinates')}</Button>
    </form>
  );
}
export { MapControls };
