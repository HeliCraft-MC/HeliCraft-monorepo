import { useCallback, useState } from 'react';
import type { MinecraftBanner } from '@helicraft/alhena';
import { BASE_LAYER, MAX_LAYERS } from './banner-model';

type BannerLayer = MinecraftBanner['layers'][number];
interface BannerEditing {
  readonly selected: number;
  readonly ink: MinecraftBanner['baseColor'];
  readonly current: BannerLayer | undefined;
  readonly selectLayer: (position: number) => void;
  readonly changeColor: (color: MinecraftBanner['baseColor']) => void;
  readonly changeInk: (color: MinecraftBanner['baseColor']) => void;
  readonly addPattern: (pattern: BannerLayer['pattern']) => void;
  readonly remove: (position: number) => void;
  readonly move: (position: number, direction: number) => void;
  readonly clear: () => void;
}
// oxlint-disable-next-line max-lines-per-function -- Controlled editing keeps selection aligned with bounded layer insertion, removal and reordering.
function useBannerEditing(
  value: MinecraftBanner,
  onChange: (value: MinecraftBanner) => void,
): BannerEditing {
  const [selected, setSelected] = useState(BASE_LAYER);
  const [ink, setInk] = useState<MinecraftBanner['baseColor']>('white');
  const current = value.layers[selected];
  const selectLayer = useCallback(
    (position: number): void => {
      setSelected(position);
      const layer = value.layers[position];
      if (layer) {
        setInk(layer.color);
      }
    },
    [value.layers],
  );
  const changeColor = useCallback(
    (color: MinecraftBanner['baseColor']): void => {
      if (current === undefined) {
        onChange({ ...value, baseColor: color });
      } else {
        onChange({
          ...value,
          layers: value.layers.map((layer, index) =>
            index === selected ? { ...layer, color } : layer,
          ),
        });
        setInk(color);
      }
    },
    [current, onChange, selected, value],
  );
  const changeInk = useCallback((color: MinecraftBanner['baseColor']): void => {
    setInk(color);
  }, []);
  const addPattern = useCallback(
    (pattern: BannerLayer['pattern']): void => {
      if (value.layers.length >= MAX_LAYERS) {
        return;
      }
      onChange({ ...value, layers: [...value.layers, { pattern, color: ink }] });
      setSelected(value.layers.length);
    },
    [ink, onChange, value],
  );
  const remove = useCallback(
    (position: number): void => {
      onChange({ ...value, layers: value.layers.filter((_layer, index) => index !== position) });
      if (selected === position) {
        setSelected(BASE_LAYER);
      } else if (selected > position) {
        setSelected(selected - 1);
      }
    },
    [onChange, selected, value],
  );
  const move = useCallback(
    (position: number, direction: number): void => {
      const next = position + direction;
      const layers = [...value.layers];
      const layer = layers[position];
      const adjacent = layers[next];
      if (!layer || !adjacent) {
        return;
      }
      layers[position] = adjacent;
      layers[next] = layer;
      onChange({ ...value, layers });
      if (selected === position) {
        setSelected(next);
      } else if (selected === next) {
        setSelected(position);
      }
    },
    [onChange, selected, value],
  );
  const clear = useCallback((): void => {
    onChange({ ...value, layers: [] });
    setSelected(BASE_LAYER);
  }, [onChange, value]);
  return {
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
  };
}
export { useBannerEditing };
