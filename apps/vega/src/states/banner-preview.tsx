import type { ReactElement } from 'react';
import type { MinecraftBanner } from '@helicraft/alhena';
import { BannerTexture } from './banner-texture';
import styles from './banner-preview.module.scss';

const SHORT_SIDE = 20;
const LONG_SIDE = 40;

function BannerPreview({
  design,
  horizontal = false,
  label = 'Minecraft banner',
}: Readonly<{
  design: MinecraftBanner;
  horizontal?: boolean;
  label?: string;
}>): ReactElement {
  return (
    <svg
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Native SVG needs an image role for its accessible name.
      role="img"
      aria-label={label}
      viewBox={horizontal ? '0 0 40 20' : '0 0 20 40'}
      width={horizontal ? LONG_SIDE : SHORT_SIDE}
      height={horizontal ? SHORT_SIDE : LONG_SIDE}
      className={`${styles.banner} ${horizontal ? styles.horizontal : ''}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={horizontal ? 'translate(40 0) rotate(90)' : undefined}>
        <BannerTexture color={design.baseColor} />
        {design.layers.map((layer, position) => (
          <BannerTexture
            // oxlint-disable-next-line react/no-array-index-key -- Texture layers have positional identity and no local state.
            key={`${position}-${layer.pattern}-${layer.color}`}
            color={layer.color}
            pattern={layer.pattern}
          />
        ))}
      </g>
    </svg>
  );
}
export { BannerPreview };
