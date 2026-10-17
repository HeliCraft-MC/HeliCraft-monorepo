import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { VotingInput } from '@helicraft/alhena';
import { Checkbox } from '@helicraft/atria';
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
  const change = usePropCache<NonNullable<ComponentProps<typeof Checkbox>['onChange']>>(scope);
  return (
    <div className={styles.editor}>
      {groups.map((question) => (
        <fieldset key={question.id} className={styles.card} disabled={disabled}>
          <legend>{displayText(question.title, locale)}</legend>
          <small>
            {uiText(locale, 'Выберите от 1 до', 'Choose between 1 and')} {question.maxSelections}
          </small>
          {input.options
            .filter((option) => question.optionIds.includes(option.id))
            .map((option) => (
              <Checkbox
                key={option.id}
                label={displayText(option.label, locale)}
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
            ))}
        </fieldset>
      ))}
    </div>
  );
}
export { VotingBallot };
