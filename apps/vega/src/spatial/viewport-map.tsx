import type { ReactElement } from 'react';
import type { FlatMapBounds } from '@helicraft/atria';
import type { SpatialSnapshot, PublicTerritory } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { PoliticalMap } from './map-view';
import type { PoliticalMapProps } from './map-view';
import { usePoliticalViewport } from './use-viewport';

const EMPTY_TERRITORIES: readonly PublicTerritory[] = [];
function ViewportMap({
  initial,
  bounds,
  ...props
}: Readonly<
  Omit<PoliticalMapProps, 'territories'> & {
    initial: SpatialSnapshot;
    bounds: FlatMapBounds;
  }
>): ReactElement {
  const { locale } = useTranslation();
  const viewport = usePoliticalViewport(props.world.id, initial, bounds);
  return (
    <div>
      <PoliticalMap
        {...props}
        territories={viewport.snapshot?.territories ?? EMPTY_TERRITORIES}
        onBounds={viewport.handleBounds}
      />
      {viewport.pending && (
        <output>
          {uiText(locale, 'Загрузка границ видимой области…', 'Loading boundaries for this area…')}
        </output>
      )}
      {viewport.failed && (
        <p role="alert">
          {uiText(
            locale,
            'Не удалось загрузить границы этой области. Измените масштаб или повторите запрос.',
            'Could not load boundaries for this area. Change the zoom or retry.',
          )}
        </p>
      )}
    </div>
  );
}
export { ViewportMap };
