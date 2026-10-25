import { useId, useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { VotingInput } from '@helicraft/alhena';
import { usePropCache, rowKey } from './use-prop-cache';
import { displayText, uiText } from './text';
import { useTranslation } from '../i18n';
import styles from './states.module.scss';

function VotingBallot({
  input,
  choices,
  onChange,
  disabled,
}: Readonly<{
  input: VotingInput;
  choices: string[];
  onChange: (choices: string[]) => void;
  disabled: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const prefix = useId();
  const groups = useMemo(
    () =>
      input.questions ?? [
        {
          id: 'single',
          title: input.title,
          optionIds: input.options.map((option) => option.id),
          maxSelections: input.maxSelections,
        },
      ],
    [input],
  );
  const scope = useMemo(() => [input, choices, onChange], [input, choices, onChange]);
  const change = usePropCache<(event: ChangeEvent<HTMLInputElement>) => void>(scope);
  return (
    <div className={styles.editor}>
      {groups.map((question) => (
        <fieldset key={question.id} className={styles.card} disabled={disabled}>
          <legend>{displayText(question.title, locale)}</legend>
          <small>
            {question.maxSelections === 1
              ? uiText(locale, 'Выберите один ответ', 'Choose one answer')
              : `${uiText(locale, 'Выберите от 1 до', 'Choose between 1 and')} ${question.maxSelections}`}
          </small>
          {input.options
            .filter((option) => question.optionIds.includes(option.id))
            .map((option) => (
              <label key={option.id} className={styles.ballotChoice}>
                <input
                  type={question.maxSelections === 1 ? 'radio' : 'checkbox'}
                  name={`${prefix}-${question.id}`}
                  checked={choices.includes(option.id)}
                  disabled={
                    !choices.includes(option.id) &&
                    question.maxSelections > 1 &&
                    choices.filter((id) => question.optionIds.includes(id)).length >=
                      question.maxSelections
                  }
                  onChange={change(rowKey('answer', option.id), (event) => {
                    if (!event.currentTarget.checked) {
                      onChange(choices.filter((id) => id !== option.id));
                    } else if (question.maxSelections === 1) {
                      onChange([
                        ...choices.filter((id) => !question.optionIds.includes(id)),
                        option.id,
                      ]);
                    } else {
                      onChange([...choices, option.id]);
                    }
                  })}
                />
                <span>{displayText(option.label, locale)}</span>
              </label>
            ))}
        </fieldset>
      ))}
    </div>
  );
}
export { VotingBallot };
