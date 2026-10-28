import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { FlatMap } from '@helicraft/atria';
import type { FlatMapProps } from '@helicraft/atria';
import type { PublicTerritory, SpatialWorld } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

const DEFAULT_NATIVE_ZOOM = 3;
const DEFAULT_EXTRA_ZOOM = 2;
interface PoliticalMapProps {
  readonly world: SpatialWorld;
  readonly territories: readonly PublicTerritory[];
  readonly selected?: string;
  readonly showNames?: boolean;
  readonly showBoundaries?: boolean;
  readonly showTiles?: boolean;
  readonly center: FlatMapProps['center'];
  readonly zoom: number;
  readonly geometry?: FlatMapProps['geometry'];
  readonly mode?: FlatMapProps['mode'];
  readonly onChange?: FlatMapProps['onChange'];
  readonly onModeChange?: FlatMapProps['onModeChange'];
  readonly onSelect?: FlatMapProps['onSelect'];
  readonly onBounds?: FlatMapProps['onBounds'];
  readonly onViewChange?: FlatMapProps['onViewChange'];
  readonly onPoint?: FlatMapProps['onPoint'];
}
function PoliticalMap(props: PoliticalMapProps): ReactElement {
  const { locale } = useTranslation();
  const shapes = useMemo(
    () =>
      props.territories.map((territory) => ({
        id: territory.stateId,
        name: displayText(territory.name, locale),
        color: territory.color,
        geometry: territory.geometry,
        selected: territory.stateId === props.selected,
      })),
    [props.territories, props.selected, locale],
  );
  return (
    <FlatMap
      key={props.world.id}
      label={uiText(locale, 'Политическая карта Minecraft — X/Z', 'Minecraft political map — X/Z')}
      loadingLabel={uiText(locale, 'Загрузка интерактивной карты…', 'Loading interactive map…')}
      errorLabel={uiText(
        locale,
        'Не удалось загрузить карту. Перезагрузите страницу.',
        'Could not load the map. Reload this page.',
      )}
      tileErrorLabel={uiText(
        locale,
        'Часть поверхности ещё не отрисована или временно недоступна. Границы показаны независимо от подложки.',
        'Some terrain has not been rendered or is temporarily unavailable. Boundaries remain visible.',
      )}
      tileUrl={`/api/v1/public/spatial/worlds/${props.world.id}/tiles/{z}/{x}/{y}`}
      attribution="squaremap · Minecraft"
      maxNativeZoom={props.world.maxZoom ?? DEFAULT_NATIVE_ZOOM}
      extraZoom={props.world.extraZoom ?? DEFAULT_EXTRA_ZOOM}
      locale={locale}
      shapes={shapes}
      showNames={props.showNames}
      showBoundaries={props.showBoundaries}
      showTiles={props.showTiles}
      center={props.center}
      zoom={props.zoom}
      geometry={props.geometry}
      mode={props.mode}
      onChange={props.onChange}
      onModeChange={props.onModeChange}
      onSelect={props.onSelect}
      onPoint={props.onPoint}
      onBounds={props.onBounds}
      onViewChange={props.onViewChange}
    />
  );
}
export { PoliticalMap, type PoliticalMapProps };
