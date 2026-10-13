import type { ReactElement } from 'react';
import type { MinecraftBanner } from '@helicraft/alhena';
import { dyeRows, patternColumns } from './banner-model';

const CELL_WIDTH = 20;
const CELL_HEIGHT = 40;
const CELL_GAP = 2;
const ATLAS_WIDTH = 946;
const ATLAS_HEIGHT = 714;
function BannerTexture({
  color,
  pattern,
}: Readonly<{
  color: MinecraftBanner['baseColor'];
  pattern?: MinecraftBanner['layers'][number]['pattern'];
}>): ReactElement {
  const column = pattern === undefined ? 0 : patternColumns[pattern];
  const viewBox = `${column * (CELL_WIDTH + CELL_GAP)} ${dyeRows[color] * (CELL_HEIGHT + CELL_GAP)} ${CELL_WIDTH} ${CELL_HEIGHT}`;
  return (
    <svg
      width={CELL_WIDTH}
      height={CELL_HEIGHT}
      viewBox={viewBox}
      overflow="hidden"
      aria-hidden="true"
    >
      <image href="/banner/patterns.webp" width={ATLAS_WIDTH} height={ATLAS_HEIGHT} />
    </svg>
  );
}
export { BannerTexture };
