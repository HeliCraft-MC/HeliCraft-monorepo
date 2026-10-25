import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { MinecraftBanner } from '@helicraft/alhena';
import { Icon, Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import { BannerPreview } from './banner-preview';
import { bannerLabel } from './banner-labels';
import { BASE_LAYER, MAX_LAYERS } from './banner-model';
import { usePropCache } from './use-prop-cache';
import styles from './banner-editor.module.scss';

const MOVE_UP = -1;
function BannerLayers({
  value,
  selected,
  onSelect,
  onRemove,
  onMove,
}: Readonly<{
  value: MinecraftBanner;
  selected: number;
  onSelect: (position: number) => void;
  onRemove: (position: number) => void;
  onMove: (position: number, direction: number) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const scope = useMemo(() => [onSelect, onRemove, onMove], [onSelect, onRemove, onMove]);
  const cached = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  const layers = useMemo(
    () =>
      value.layers.map((layer) => ({
        layer,
        design: { baseColor: value.baseColor, layers: [layer] },
      })),
    [value],
  );
  const base = useMemo(() => ({ baseColor: value.baseColor, layers: [] }), [value.baseColor]);
  return (
    <div className={styles.layers}>
      <h3>
        {uiText(locale, 'Слои', 'Layers')} · {value.layers.length}/{MAX_LAYERS}
      </h3>
      <Button
        tone="quiet"
        className={styles.layerSelect}
        aria-pressed={selected === BASE_LAYER}
        onClick={cached('base', () => {
          onSelect(BASE_LAYER);
        })}
      >
        <span className={styles.layerThumbnail} aria-hidden="true">
          <BannerPreview design={base} />
        </span>
        <span>
          {uiText(locale, 'Основа', 'Base')} · {bannerLabel(value.baseColor, locale)}
        </span>
      </Button>
      <ol>
        {layers.map(({ layer, design }, position) => (
          <li
            // oxlint-disable-next-line react/no-array-index-key -- The six controlled banner layers have positional identity.
            key={position}
          >
            <Button
              tone="quiet"
              className={styles.layerSelect}
              aria-pressed={selected === position}
              onClick={cached(`select-${position}`, () => {
                onSelect(position);
              })}
            >
              <span className={styles.layerThumbnail} aria-hidden="true">
                <BannerPreview design={design} />
              </span>
              <span>
                {position + 1}. {bannerLabel(layer.pattern, locale)}
                <small>{bannerLabel(layer.color, locale)}</small>
              </span>
            </Button>
            <div className={styles.layerActions}>
              <Button
                tone="quiet"
                aria-label={uiText(locale, 'Переместить слой выше', 'Move layer up')}
                disabled={position === 0}
                onClick={cached(`up-${position}`, () => {
                  onMove(position, MOVE_UP);
                })}
              >
                <Icon name="arrowUp" />
              </Button>
              <Button
                tone="quiet"
                aria-label={uiText(locale, 'Переместить слой ниже', 'Move layer down')}
                disabled={position === value.layers.length - 1}
                onClick={cached(`down-${position}`, () => {
                  onMove(position, 1);
                })}
              >
                <Icon name="arrowDown" />
              </Button>
              <Button
                tone="quiet"
                aria-label={uiText(locale, 'Удалить слой', 'Remove layer')}
                onClick={cached(`remove-${position}`, () => {
                  onRemove(position);
                })}
              >
                <Icon name="close" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {value.layers.length === 0 && (
        <p>
          {uiText(
            locale,
            'Пока только основа. Выберите узор в галерее.',
            'Only the base so far. Add a pattern from the gallery.',
          )}
        </p>
      )}
    </div>
  );
}
export { BannerLayers };
