// oxlint-disable import/max-dependencies -- The workspace composes independent preview, palette, layer and pattern controls with typed editing state.
import type { ReactElement } from 'react';
import type { MinecraftBanner } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import { BannerPreview } from './banner-preview';
import { BannerPalette } from './banner-palette';
import { BannerLayers } from './banner-layers';
import { BannerPatterns } from './banner-patterns';
import { useBannerEditing } from './use-banner-editing';
import { BASE_LAYER, MAX_LAYERS } from './banner-model';
import styles from './banner-editor.module.scss';

function BannerEditor({
  value,
  onChange,
  horizontal = false,
}: Readonly<{
  value: MinecraftBanner;
  onChange: (value: MinecraftBanner) => void;
  horizontal?: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const {
    selected,
    ink,
    current,
    selectLayer,
    changeColor,
    changeInk,
    addPattern,
    remove,
    move,
    clear,
  } = useBannerEditing(value, onChange);
  return (
    <div className={styles.workspace}>
      <section className={styles.preview}>
        <h3>{uiText(locale, 'Предпросмотр', 'Preview')}</h3>
        <div className={`${styles.stage} ${horizontal ? styles.horizontal : ''}`}>
          <BannerPreview
            design={value}
            horizontal={horizontal}
            label={uiText(locale, 'Предпросмотр флага', 'Flag preview')}
          />
        </div>
        <p>
          {horizontal ? '2:1' : '1:2'} · {uiText(locale, 'Игровые текстуры', 'Game textures')}
        </p>
      </section>
      <section className={styles.controls}>
        <BannerLayers
          value={value}
          selected={current === undefined ? BASE_LAYER : selected}
          onSelect={selectLayer}
          onRemove={remove}
          onMove={move}
        />
        <BannerPalette
          label={
            current === undefined
              ? uiText(locale, 'Цвет основы', 'Base color')
              : uiText(locale, 'Цвет выбранного слоя', 'Selected layer color')
          }
          value={current?.color ?? value.baseColor}
          onChange={changeColor}
        />
        <Button tone="quiet" onClick={clear} disabled={value.layers.length === 0}>
          {uiText(locale, 'Очистить узоры', 'Clear patterns')}
        </Button>
      </section>
      <section className={styles.patterns}>
        <h3>{uiText(locale, 'Добавить узор', 'Add a pattern')}</h3>
        <p>
          {uiText(
            locale,
            'Выберите цвет, затем нажмите на узор. Каждый узор добавляется новым слоем.',
            'Choose a color, then a pattern. Each pattern adds a new layer.',
          )}
        </p>
        <BannerPalette
          label={uiText(locale, 'Цвет нового узора', 'New pattern color')}
          value={ink}
          onChange={changeInk}
        />
        <BannerPatterns
          color={ink}
          disabled={value.layers.length >= MAX_LAYERS}
          onAdd={addPattern}
          horizontal={horizontal}
        />
        {value.layers.length >= MAX_LAYERS && (
          <output>
            {uiText(
              locale,
              'Достигнут игровой лимит: 6 узоров. Удалите слой, чтобы добавить другой.',
              'Game limit reached: 6 patterns. Remove a layer to add another.',
            )}
          </output>
        )}
      </section>
    </div>
  );
}
export { BannerEditor };
