import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { SurveyBlock } from '@helicraft/alhena';
import { Checkbox, FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';

function ImageSettings({
  block,
  onChange,
}: Readonly<{ block: SurveyBlock; onChange: (block: SurveyBlock) => void }>): ReactElement {
  const { locale } = useTranslation();
  const scope = useMemo(() => [block, onChange], [block, onChange]);
  const select = usePropCache<NonNullable<ComponentProps<typeof Select>['onChange']>>(scope);
  const check = usePropCache<NonNullable<ComponentProps<typeof Checkbox>['onChange']>>(scope);
  return (
    <>
      <FormField
        htmlFor={`${block.id}-display`}
        label={uiText(locale, 'Показ изображений', 'Image layout')}
      >
        <Select
          id={`${block.id}-display`}
          value={block.displayMode}
          onChange={select('display', (event) => {
            const displayMode = event.currentTarget.value;
            if (
              displayMode === 'GRID' ||
              displayMode === 'CAROUSEL' ||
              displayMode === 'RANDOM' ||
              displayMode === 'VERTICAL'
            ) {
              onChange({ ...block, displayMode });
            }
          })}
        >
          <option value="GRID">{uiText(locale, 'Сетка', 'Grid')}</option>
          <option value="CAROUSEL">{uiText(locale, 'Карусель', 'Carousel')}</option>
          <option value="RANDOM">{uiText(locale, 'Случайное изображение', 'Random image')}</option>
          <option value="VERTICAL">{uiText(locale, 'Вертикально', 'Vertical')}</option>
        </Select>
      </FormField>
      <Checkbox
        label={uiText(locale, 'Показывать подписи', 'Show captions')}
        checked={block.showCaptions}
        onChange={check('captions', (event) => {
          onChange({ ...block, showCaptions: event.currentTarget.checked });
        })}
      />
    </>
  );
}
export { ImageSettings };
