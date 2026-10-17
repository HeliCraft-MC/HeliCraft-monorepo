import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { VotingInput } from '@helicraft/alhena';
import { Button, FormField, TextField } from '@helicraft/atria';
import { LocalizedInputField } from './localized-input';
import { usePropCache, rowKey } from './use-prop-cache';
import { changeQuestion, removeQuestion, moveQuestion, MAX_OPTIONS } from './poll-questions-model';
import type { PollQuestion } from './poll-questions-model';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './states.module.scss';

const MIN_OPTIONS = 2;
const MOVE_UP = -1;
function PollQuestionEditor({
  input,
  question,
  index,
  onChange,
}: Readonly<{
  input: VotingInput;
  question: PollQuestion;
  index: number;
  onChange: (input: VotingInput) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const scope = useMemo(() => [input, question, onChange], [input, question, onChange]);
  const button = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  const text = usePropCache<NonNullable<ComponentProps<typeof TextField>['onChange']>>(scope);
  const localized =
    usePropCache<NonNullable<ComponentProps<typeof LocalizedInputField>['onChange']>>(scope);
  return (
    <section className={styles.card}>
      <div className={styles.heading}>
        <h3>
          {uiText(locale, 'Вопрос', 'Question')} {index + 1}
        </h3>
        <div className={styles.actions}>
          <Button
            tone="quiet"
            disabled={index === 0}
            onClick={button('up', () => {
              onChange(moveQuestion(input, question.id, MOVE_UP));
            })}
          >
            {uiText(locale, 'Выше', 'Move up')}
          </Button>
          <Button
            tone="quiet"
            disabled={index + 1 === input.questions?.length}
            onClick={button('down', () => {
              onChange(moveQuestion(input, question.id, 1));
            })}
          >
            {uiText(locale, 'Ниже', 'Move down')}
          </Button>
          <Button
            tone="quiet"
            disabled={input.questions?.length === 1}
            onClick={button('remove', () => {
              onChange(removeQuestion(input, question));
            })}
          >
            {uiText(locale, 'Удалить вопрос', 'Remove question')}
          </Button>
        </div>
      </div>
      <LocalizedInputField
        label={uiText(locale, 'Текст вопроса', 'Question text')}
        value={question.title}
        onChange={localized('title', (title) => {
          onChange(changeQuestion(input, { ...question, title }));
        })}
      />
      {input.options
        .filter((option) => question.optionIds.includes(option.id))
        .map((option, position) => (
          <div key={option.id} className={styles.editor}>
            <LocalizedInputField
              label={`${uiText(locale, 'Ответ', 'Answer')} ${position + 1}`}
              value={option.label}
              onChange={localized(rowKey('option', option.id), (label) => {
                onChange({
                  ...input,
                  options: input.options.map((item) =>
                    item.id === option.id ? { ...item, label } : item,
                  ),
                });
              })}
            />
            <Button
              tone="quiet"
              disabled={question.optionIds.length <= MIN_OPTIONS}
              onClick={button(rowKey('delete', option.id), () => {
                const next = changeQuestion(input, {
                  ...question,
                  optionIds: question.optionIds.filter((id) => id !== option.id),
                  maxSelections: Math.min(question.maxSelections, question.optionIds.length - 1),
                });
                onChange({
                  ...next,
                  options: input.options.filter((item) => item.id !== option.id),
                });
              })}
            >
              {uiText(locale, 'Удалить ответ', 'Remove answer')}
            </Button>
          </div>
        ))}
      <Button
        tone="quiet"
        disabled={input.options.length >= MAX_OPTIONS}
        onClick={button('add', () => {
          const option = { id: crypto.randomUUID(), label: {} };
          const next = changeQuestion(input, {
            ...question,
            optionIds: [...question.optionIds, option.id],
          });
          onChange({ ...next, options: [...input.options, option] });
        })}
      >
        {uiText(locale, 'Добавить ответ', 'Add answer')}
      </Button>
      <FormField
        htmlFor={`${question.id}-limit`}
        label={uiText(locale, 'Максимум ответов на вопрос', 'Maximum answers per question')}
        help={uiText(
          locale,
          'При значении 1 участник выбирает один ответ. Для нескольких ответов увеличьте лимит. Каждый вопрос требует ответа; воздержаться можно от всего опроса.',
          'Set 1 for a single answer, or increase the limit for multiple answers. Every question requires an answer; abstention applies to the whole poll.',
        )}
      >
        <TextField
          id={`${question.id}-limit`}
          type="number"
          min={1}
          max={question.optionIds.length}
          value={question.maxSelections}
          onChange={text('limit', (event) => {
            onChange(
              changeQuestion(input, {
                ...question,
                maxSelections: Number(event.currentTarget.value),
              }),
            );
          })}
        />
      </FormField>
    </section>
  );
}
export { PollQuestionEditor };
