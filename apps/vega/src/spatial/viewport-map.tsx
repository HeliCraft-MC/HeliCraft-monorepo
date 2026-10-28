import type { ReactElement } from 'react';
import type { FlatMapBounds } from '@helicraft/atria';
import type { SpatialSnapshot, PublicTerritory } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { PoliticalMap } from './map-view';
import type { PoliticalMapProps } from './map-view';
import { usePoliticalViewport } from './use-viewport';
import { Button } from '@helicraft/atria';
import styles from './spatial.module.scss';

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
    <div className={styles.viewport}>
      <PoliticalMap
        {...props}
        territories={viewport.snapshot?.territories ?? EMPTY_TERRITORIES}
        onBounds={viewport.handleBounds}
      />
      {viewport.pending && (
        <output className={styles.viewportStatus}>
          {uiText(locale, 'Загрузка границ видимой области…', 'Loading boundaries for this area…')}
        </output>
      )}
      {viewport.failed && (
        <div role="alert" className={styles.viewportStatus}>
          <span>
            {uiText(
              locale,
              'Не удалось обновить границы этой области.',
              'Could not update boundaries for this area.',
            )}
          </span>
          <Button tone="quiet" onClick={viewport.handleRetry}>
            {uiText(locale, 'Повторить', 'Retry')}
          </Button>
        </div>
      )}
    </div>
  );
}
export { ViewportMap };
