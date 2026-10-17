import { useMemo, useCallback } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { SurveyAnswer, SurveyBlock, VotingInput } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import styles from './survey.module.scss';

function SurveySingleChoice({
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
  const scope = useMemo(() => [block.id, onChange], [block.id, onChange]);
  const change = usePropCache<(event: ChangeEvent<HTMLInputElement>) => void>(scope);
  const clear = useCallback((): void => {
    onChange(block.id, []);
  }, [block.id, onChange]);
  return (
    <fieldset>
      <legend>
        {displayText(block.title, locale)}
        {block.required ? ' *' : ''}
      </legend>
      {input.options
        .filter((option) => block.optionIds.includes(option.id))
        .map((option) => (
          <label key={option.id} className={styles.radio}>
            <input
              type="radio"
              name={block.id}
              value={option.id}
              required={block.required}
              checked={Array.isArray(value) && value.includes(option.id)}
              onChange={change(option.id, () => {
                onChange(block.id, [option.id]);
              })}
            />
            {displayText(option.label, locale)}
          </label>
        ))}
      {!block.required && (
        <Button tone="quiet" onClick={clear}>
          {uiText(locale, 'Очистить выбор', 'Clear selection')}
        </Button>
      )}
    </fieldset>
  );
}
export { SurveySingleChoice };
