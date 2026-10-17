import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { SurveyAnswer, SurveyBlock, VotingInput } from '@helicraft/alhena';
import { Checkbox, FormField, Select, Textarea, TextField } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText, displayText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { SurveySingleChoice } from './single-choice';

function SurveyQuestion({
  input,
  block,
  value,
  onChange,
}: Readonly<{
  input: VotingInput;
  block: SurveyBlock;
  value: SurveyAnswer['value'];
  onChange: (id: string, value: SurveyAnswer['value']) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const scope = useMemo(() => [block, value, onChange], [block, value, onChange]);
  const text = usePropCache<NonNullable<ComponentProps<typeof TextField>['onChange']>>(scope);
  const area = usePropCache<NonNullable<ComponentProps<typeof Textarea>['onChange']>>(scope);
  const check = usePropCache<NonNullable<ComponentProps<typeof Checkbox>['onChange']>>(scope);
  const select = usePropCache<NonNullable<ComponentProps<typeof Select>['onChange']>>(scope);
  const title = `${displayText(block.title, locale)}${block.required ? ' *' : ''}`;
  const selected = Array.isArray(value) ? value : [];
  const options = input.options.filter((option) => block.optionIds.includes(option.id));
  if (block.type === 'SHORT_TEXT' || block.type === 'PARAGRAPH') {
    return (
      <FormField htmlFor={`${block.id}-answer`} label={title}>
        {block.type === 'SHORT_TEXT' ? (
          <TextField
            id={`${block.id}-answer`}
            value={typeof value === 'string' ? value : ''}
            required={block.required}
            minLength={block.minLength}
            maxLength={block.maxLength}
            onChange={text('text', (event) => {
              onChange(block.id, event.currentTarget.value);
            })}
          />
        ) : (
          <Textarea
            id={`${block.id}-answer`}
            value={typeof value === 'string' ? value : ''}
            required={block.required}
            minLength={block.minLength}
            maxLength={block.maxLength}
            onChange={area('area', (event) => {
              onChange(block.id, event.currentTarget.value);
            })}
          />
        )}
      </FormField>
    );
  }
  if (block.type === 'DROPDOWN') {
    return (
      <FormField htmlFor={`${block.id}-answer`} label={title}>
        <Select
          id={`${block.id}-answer`}
          required={block.required}
          value={selected[0] ?? ''}
          onChange={select('select', (event) => {
            onChange(block.id, event.currentTarget.value ? [event.currentTarget.value] : []);
          })}
        >
          <option value="">{uiText(locale, 'Выберите вариант', 'Choose an option')}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {displayText(option.label, locale)}
            </option>
          ))}
        </Select>
      </FormField>
    );
  }
  if (block.type === 'SINGLE_CHOICE') {
    return <SurveySingleChoice input={input} block={block} value={value} onChange={onChange} />;
  }
  return (
    <fieldset>
      <legend>{title}</legend>
      {options.map((option) => (
        <Checkbox
          key={option.id}
          label={displayText(option.label, locale)}
          checked={selected.includes(option.id)}
          disabled={
            block.type === 'CHECKBOX' &&
            !selected.includes(option.id) &&
            selected.length >= block.maxSelections
          }
          onChange={check(option.id, (event) => {
            if (!event.currentTarget.checked) {
              onChange(
                block.id,
                selected.filter((id) => id !== option.id),
              );
            } else if (block.type === 'CHECKBOX') {
              onChange(block.id, [...selected, option.id]);
            } else {
              onChange(block.id, [option.id]);
            }
          })}
        />
      ))}
    </fieldset>
  );
}
export { SurveyQuestion };
