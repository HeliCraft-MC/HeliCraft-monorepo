import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { SurveyBlock, VotingInput } from '@helicraft/alhena';
import { Button, FormField, TextField } from '@helicraft/atria';
import { LocalizedInputField } from '../localized-input';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { changeBlock, MAX_OPTIONS } from './model';
import styles from './survey.module.scss';

const EMPTY_TEXT = {};
const MIN_OPTIONS = 2;
function ChoiceEditor({
  input,
  block,
  onChange,
}: Readonly<{
  input: VotingInput;
  block: SurveyBlock;
  onChange: (input: VotingInput) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const scope = useMemo(() => [input, block, onChange], [input, block, onChange]);
  const click = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  const localized =
    usePropCache<NonNullable<ComponentProps<typeof LocalizedInputField>['onChange']>>(scope);
  const text = usePropCache<NonNullable<ComponentProps<typeof TextField>['onChange']>>(scope);
  return (
    <div className={styles.editor}>
      {block.optionIds.map((id, index) => (
        <div key={id}>
          <LocalizedInputField
            label={`${uiText(locale, 'Вариант', 'Option')} ${index + 1}`}
            value={input.options.find((option) => option.id === id)?.label ?? EMPTY_TEXT}
            onChange={localized(id, (label) => {
              onChange({
                ...input,
                options: input.options.map((option) =>
                  option.id === id ? { ...option, label } : option,
                ),
              });
            })}
          />
          <Button
            tone="quiet"
            disabled={block.optionIds.length <= MIN_OPTIONS}
            onClick={click(id, () => {
              const ids = block.optionIds.filter((optionId) => optionId !== id);
              const next = changeBlock(input, {
                ...block,
                optionIds: ids,
                maxSelections: Math.min(block.maxSelections, ids.length),
              });
              onChange({ ...next, options: input.options.filter((option) => option.id !== id) });
            })}
          >
            {uiText(locale, 'Удалить вариант', 'Remove option')}
          </Button>
        </div>
      ))}
      <Button
        tone="quiet"
        disabled={input.options.length >= MAX_OPTIONS}
        onClick={click('add', () => {
          const option = { id: crypto.randomUUID(), label: {} };
          const next = changeBlock(input, { ...block, optionIds: [...block.optionIds, option.id] });
          onChange({ ...next, options: [...input.options, option] });
        })}
      >
        {uiText(locale, 'Добавить вариант', 'Add option')}
      </Button>
      {block.type === 'CHECKBOX' && (
        <FormField
          htmlFor={`${block.id}-limit`}
          label={uiText(locale, 'Максимум вариантов', 'Maximum selections')}
        >
          <TextField
            id={`${block.id}-limit`}
            type="number"
            min={1}
            max={block.optionIds.length}
            value={block.maxSelections}
            onChange={text('limit', (event) => {
              onChange(
                changeBlock(input, { ...block, maxSelections: Number(event.currentTarget.value) }),
              );
            })}
          />
        </FormField>
      )}
    </div>
  );
}
export { ChoiceEditor };
