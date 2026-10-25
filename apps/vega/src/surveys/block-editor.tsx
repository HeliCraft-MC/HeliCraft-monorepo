// oxlint-disable import/max-dependencies -- The block editor composes typed controls for each supported survey block.
import { useMemo, useCallback } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { SurveyBlock, VotingInput } from '@helicraft/alhena';
import { Checkbox, FormField, Select, TextField } from '@helicraft/atria';
import { LocalizedInputField } from '../localized-input';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { changeBlock, changeType, blockTypes } from './model';
import { blockName } from './text';
import { BlockToolbar } from './block-toolbar';
import { ChoiceEditor } from './choice-editor';
import { SurveyImagePicker } from './image-picker';
import { ImageSettings } from './image-settings';
import styles from './survey.module.scss';

// oxlint-disable-next-line max-lines-per-function -- Each block type keeps its labelled configuration fields together.
function BlockEditor({
  input,
  block,
  index,
  onChange,
}: Readonly<{
  input: VotingInput;
  block: SurveyBlock;
  index: number;
  onChange: (input: VotingInput) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const scope = useMemo(() => [input, block, onChange], [input, block, onChange]);
  const localized =
    usePropCache<NonNullable<ComponentProps<typeof LocalizedInputField>['onChange']>>(scope);
  const select = usePropCache<NonNullable<ComponentProps<typeof Select>['onChange']>>(scope);
  const text = usePropCache<NonNullable<ComponentProps<typeof TextField>['onChange']>>(scope);
  const check = usePropCache<NonNullable<ComponentProps<typeof Checkbox>['onChange']>>(scope);
  const update = useCallback(
    (next: SurveyBlock): void => {
      onChange(changeBlock(input, next));
    },
    [input, onChange],
  );
  const decorative = ['TEXT_BLOCK', 'IMAGE_BLOCK'].includes(block.type);
  return (
    <section
      className={styles.block}
      aria-label={`${uiText(locale, 'Блок', 'Block')} ${index + 1}`}
    >
      <BlockToolbar input={input} block={block} index={index} onChange={onChange} />
      <FormField htmlFor={`${block.id}-type`} label={uiText(locale, 'Тип блока', 'Block type')}>
        <Select
          id={`${block.id}-type`}
          value={block.type}
          onChange={select('type', (event) => {
            onChange(changeType(input, block, event.currentTarget.value));
          })}
        >
          {blockTypes.map((type) => (
            <option key={type} value={type}>
              {blockName(type, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      <LocalizedInputField
        label={uiText(locale, 'Заголовок блока', 'Block title')}
        value={block.title}
        onChange={localized('title', (title) => {
          update({ ...block, title });
        })}
      />
      <details>
        <summary>
          {uiText(
            locale,
            'Подсказка и дополнительные настройки',
            'Description and advanced settings',
          )}
        </summary>
        <div className={styles.editor}>
          <LocalizedInputField
            label={uiText(locale, 'Подсказка', 'Description')}
            value={block.description}
            onChange={localized('description', (description) => {
              update({ ...block, description });
            })}
            multiline
          />
          {['SHORT_TEXT', 'PARAGRAPH'].includes(block.type) && (
            <div className={styles.toolbar}>
              <FormField
                htmlFor={`${block.id}-min`}
                label={uiText(locale, 'Минимум символов', 'Minimum length')}
              >
                <TextField
                  id={`${block.id}-min`}
                  type="number"
                  min={0}
                  max={block.maxLength}
                  value={block.minLength}
                  onChange={text('min', (event) => {
                    update({ ...block, minLength: Number(event.currentTarget.value) });
                  })}
                />
              </FormField>
              <FormField
                htmlFor={`${block.id}-max`}
                label={uiText(locale, 'Максимум символов', 'Maximum length')}
              >
                <TextField
                  id={`${block.id}-max`}
                  type="number"
                  min={1}
                  max={10_000}
                  value={block.maxLength}
                  onChange={text('max', (event) => {
                    update({ ...block, maxLength: Number(event.currentTarget.value) });
                  })}
                />
              </FormField>
            </div>
          )}
        </div>
      </details>
      {!decorative && (
        <Checkbox
          label={uiText(locale, 'Обязательный вопрос', 'Required question')}
          checked={block.required}
          onChange={check('required', (event) => {
            update({ ...block, required: event.currentTarget.checked });
          })}
        />
      )}
      {['SINGLE_CHOICE', 'CHECKBOX', 'DROPDOWN'].includes(block.type) && (
        <ChoiceEditor input={input} block={block} onChange={onChange} />
      )}
      {block.type === 'TEXT_BLOCK' && (
        <>
          <LocalizedInputField
            label={uiText(locale, 'Содержимое блока', 'Block content')}
            value={block.content}
            onChange={localized('content', (content) => {
              update({ ...block, content });
            })}
            multiline
          />
          <FormField
            htmlFor={`${block.id}-style`}
            label={uiText(locale, 'Стиль блока', 'Block style')}
          >
            <Select
              id={`${block.id}-style`}
              value={block.style}
              onChange={select('style', (event) => {
                const style = event.currentTarget.value;
                if (
                  style === 'NORMAL' ||
                  style === 'INFO' ||
                  style === 'WARNING' ||
                  style === 'SUCCESS'
                ) {
                  update({ ...block, style });
                }
              })}
            >
              <option value="NORMAL">{uiText(locale, 'Обычный', 'Normal')}</option>
              <option value="INFO">{uiText(locale, 'Информация', 'Information')}</option>
              <option value="WARNING">{uiText(locale, 'Предупреждение', 'Warning')}</option>
              <option value="SUCCESS">{uiText(locale, 'Успех', 'Success')}</option>
            </Select>
          </FormField>
        </>
      )}
      {block.type === 'IMAGE_BLOCK' && (
        <>
          <ImageSettings block={block} onChange={update} />
          <SurveyImagePicker block={block} onChange={update} />
        </>
      )}
    </section>
  );
}
export { BlockEditor };
