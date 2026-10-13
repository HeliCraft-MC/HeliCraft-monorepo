import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { MinecraftBanner } from '@helicraft/alhena';
import { Button, FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import { BannerEditor } from './banner';
import { FlagUpload } from './flag-upload';
import type { StateWizardStepProps } from './wizard-types';
import styles from './banner-editor.module.scss';

function FlagsStep({
  configuration,
  onChange,
}: Pick<StateWizardStepProps, 'configuration' | 'onChange'>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [target, setTarget] = useState<'vertical' | 'horizontal'>('vertical');
  const [savedDesign, setSavedDesign] = useState<MinecraftBanner>(() =>
    configuration.horizontalFlag.mode === 'BANNER'
      ? configuration.horizontalFlag.design
      : structuredClone(configuration.verticalBanner),
  );
  const [savedMediaId, setSavedMediaId] = useState<string | null>(() =>
    configuration.horizontalFlag.mode === 'PNG' ? configuration.horizontalFlag.mediaId : null,
  );
  const vertical = useCallback((): void => {
    setTarget('vertical');
  }, []);
  const horizontal = useCallback((): void => {
    setTarget('horizontal');
  }, []);
  const changeVertical = useCallback(
    (verticalBanner: MinecraftBanner): void => {
      onChange((previous) => ({ ...previous, verticalBanner }));
    },
    [onChange],
  );
  const changeHorizontal = useCallback(
    (design: MinecraftBanner): void => {
      setSavedDesign(design);
      onChange((previous) => ({ ...previous, horizontalFlag: { mode: 'BANNER', design } }));
    },
    [onChange],
  );
  const changeSource = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      if (configuration.horizontalFlag.mode === 'BANNER') {
        setSavedDesign(configuration.horizontalFlag.design);
      } else {
        setSavedMediaId(configuration.horizontalFlag.mediaId);
      }
      onChange({
        ...configuration,
        horizontalFlag:
          event.currentTarget.value === 'PNG'
            ? { mode: 'PNG', mediaId: savedMediaId }
            : { mode: 'BANNER', design: savedDesign },
      });
    },
    [configuration, onChange, savedDesign, savedMediaId],
  );
  const copyVertical = useCallback((): void => {
    changeHorizontal(structuredClone(configuration.verticalBanner));
  }, [changeHorizontal, configuration.verticalBanner]);
  const uploaded = useCallback(
    (mediaId: string): void => {
      setSavedMediaId(mediaId);
      onChange((previous) =>
        previous.horizontalFlag.mode === 'PNG'
          ? { ...previous, horizontalFlag: { mode: 'PNG', mediaId } }
          : previous,
      );
    },
    [onChange],
  );
  return (
    <section
      className={styles.editor}
      aria-label={uiText(locale, 'Редактор флагов', 'Flag editor')}
    >
      <div className={styles.header}>
        <h2>{uiText(locale, 'Редактор флагов', 'Flag editor')}</h2>
        <div className={styles.switch}>
          <Button
            tone="quiet"
            aria-pressed={target === 'vertical'}
            aria-controls={id}
            onClick={vertical}
          >
            {uiText(locale, 'Вертикальный баннер', 'Vertical banner')}
          </Button>
          <Button
            tone="quiet"
            aria-pressed={target === 'horizontal'}
            aria-controls={id}
            onClick={horizontal}
          >
            {uiText(locale, 'Горизонтальный флаг', 'Horizontal flag')}
          </Button>
        </div>
      </div>
      <p>
        {uiText(
          locale,
          'Два независимых дизайна. Переключение сохраняет изменения каждого флага.',
          'Two independent designs. Switching preserves each flag’s changes.',
        )}
      </p>
      <div id={id}>
        {target === 'vertical' ? (
          <BannerEditor value={configuration.verticalBanner} onChange={changeVertical} />
        ) : (
          <>
            <div className={styles.source}>
              <FormField
                htmlFor={`${id}-source`}
                label={uiText(locale, 'Источник флага', 'Flag source')}
              >
                <Select
                  id={`${id}-source`}
                  value={configuration.horizontalFlag.mode}
                  onChange={changeSource}
                >
                  <option value="BANNER">
                    {uiText(locale, 'Дизайн баннера', 'Banner design')}
                  </option>
                  <option value="PNG">PNG</option>
                </Select>
              </FormField>
              {configuration.horizontalFlag.mode === 'BANNER' && (
                <Button tone="quiet" onClick={copyVertical}>
                  {uiText(locale, 'Скопировать вертикальный баннер', 'Copy vertical banner')}
                </Button>
              )}
            </div>
            {configuration.horizontalFlag.mode === 'BANNER' ? (
              <BannerEditor
                horizontal
                value={configuration.horizontalFlag.design}
                onChange={changeHorizontal}
              />
            ) : (
              <FlagUpload mediaId={configuration.horizontalFlag.mediaId} onUploaded={uploaded} />
            )}
          </>
        )}
      </div>
    </section>
  );
}
export { FlagsStep };
