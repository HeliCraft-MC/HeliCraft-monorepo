import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { MinecraftBanner } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { BannerPreview } from './banner-preview';
import { bannerLabel } from './banner-labels';
import { patternColumns, isPattern } from './banner-model';
import { usePropCache } from './use-prop-cache';
import styles from './banner-editor.module.scss';

function BannerPatterns({
  color,
  disabled,
  onAdd,
  horizontal,
}: Readonly<{
  color: MinecraftBanner['baseColor'];
  disabled: boolean;
  horizontal: boolean;
  onAdd: (pattern: MinecraftBanner['layers'][number]['pattern']) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const patterns = useMemo(
    () =>
      Object.keys(patternColumns)
        .filter((pattern) => isPattern(pattern))
        .map((pattern) => ({
          pattern,
          design: {
            baseColor:
              color === 'black' || color === 'gray' ? ('white' as const) : ('black' as const),
            layers: [{ pattern, color }],
          },
        })),
    [color],
  );
  const scope = useMemo(() => [onAdd], [onAdd]);
  const cached = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  return (
    <div className={styles.patternGrid}>
      {patterns.map(({ pattern, design }) => (
        <Button
          key={pattern}
          tone="quiet"
          className={styles.pattern}
          disabled={disabled}
          aria-label={bannerLabel(pattern, locale)}
          onClick={cached(pattern, () => {
            onAdd(pattern);
          })}
        >
          <span className={styles.thumbnail} aria-hidden="true">
            <BannerPreview design={design} horizontal={horizontal} />
          </span>
          <span>{bannerLabel(pattern, locale)}</span>
        </Button>
      ))}
    </div>
  );
}
export { BannerPatterns };
