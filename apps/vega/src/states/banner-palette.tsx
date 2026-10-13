import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { MinecraftBanner } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { bannerLabel } from './banner-labels';
import { dyes, isDye } from './banner-model';
import { usePropCache } from './use-prop-cache';
import styles from './banner-editor.module.scss';

function BannerPalette({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: MinecraftBanner['baseColor'];
  onChange: (color: MinecraftBanner['baseColor']) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const scope = useMemo(() => [onChange], [onChange]);
  const cached = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  return (
    <fieldset className={styles.palette}>
      <legend>{label}</legend>
      <div>
        {Object.entries(dyes).map(([color, hex]) => (
          <Button
            key={color}
            tone="quiet"
            className={styles.swatch}
            aria-label={bannerLabel(color, locale)}
            title={bannerLabel(color, locale)}
            aria-pressed={value === color}
            // oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- Each static dye swatch needs its own CSS color.
            style={{ backgroundColor: hex }}
            onClick={cached(color, () => {
              if (isDye(color)) {
                onChange(color);
              }
            })}
          >
            <span aria-hidden="true">{value === color ? '✓' : ''}</span>
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
export { BannerPalette };
