import type { ReactElement } from 'react';
import type { SpatialWorld } from '@helicraft/alhena';
import { ArrowUpRight, Compass, Info } from 'lucide-react';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MapControls } from './map-controls';
import type { MapSearch } from './public-data';
import styles from './spatial.module.scss';

function MapHelp({
  worlds,
  worldId,
  search,
}: Readonly<{
  worlds: readonly SpatialWorld[];
  worldId: string;
  search: MapSearch;
}>): ReactElement {
  const { locale } = useTranslation();
  return (
    <>
      <details className={styles.mapDisclosure}>
        <summary>
          <Compass size={16} aria-hidden="true" />
          {uiText(locale, 'Перейти к координатам', 'Go to coordinates')}
        </summary>
        <MapControls worlds={worlds} search={search} worldId={worldId} />
      </details>
      <details className={styles.mapDisclosure}>
        <summary>
          <Info size={16} aria-hidden="true" />
          {uiText(locale, 'Как читать карту', 'Reading the map')}
        </summary>
        <div className={styles.mapHelp}>
          <p>
            {uiText(
              locale,
              'Цветные области — утверждённые территории государств. Выберите область или государство в списке.',
              'Colored areas are ratified state territories. Select an area or a state in the list.',
            )}
          </p>
          <p>
            {uiText(
              locale,
              'За пределами областей, внутри отверстий и точно на границах — независимая территория. Государственные границы не определяют собственность на блоки.',
              'Outside these areas, inside holes and exactly on edges is Wilderness. State boundaries do not grant ownership of blocks.',
            )}
          </p>
          <p>
            {uiText(
              locale,
              'Север — отрицательный Z. Управление с клавиатуры: стрелки и + / −, когда карта в фокусе.',
              'North is negative Z. With the map focused, use arrow keys and + / − to navigate.',
            )}
          </p>
          <a href={`/app/states?lang=${locale}`}>
            {uiText(
              locale,
              'Управлять территориями своих государств',
              'Manage your states’ territories',
            )}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </details>
    </>
  );
}
export { MapHelp };
