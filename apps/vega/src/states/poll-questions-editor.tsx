import { useCallback } from 'react';
import type { ReactElement } from 'react';
import type { VotingInput } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { PollQuestionEditor } from './poll-question-editor';
import { addQuestion, MAX_OPTIONS, MAX_QUESTIONS } from './poll-questions-model';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './states.module.scss';

const NEW_OPTIONS = 2;
function PollQuestionsEditor({
  input,
  onChange,
}: Readonly<{ input: VotingInput; onChange: (input: VotingInput) => void }>): ReactElement {
  const { locale } = useTranslation();
  const add = useCallback((): void => {
    onChange(addQuestion(input));
  }, [input, onChange]);
  return (
    <div className={styles.editor}>
      {(input.questions ?? []).map((question, index) => (
        <PollQuestionEditor
          key={question.id}
          input={input}
          question={question}
          index={index}
          onChange={onChange}
        />
      ))}
      <Button
        tone="quiet"
        disabled={
          (input.questions?.length ?? 0) >= MAX_QUESTIONS ||
          input.options.length + NEW_OPTIONS > MAX_OPTIONS
        }
        onClick={add}
      >
        {uiText(locale, 'Добавить вопрос', 'Add question')}
      </Button>
    </div>
  );
}
export { PollQuestionsEditor };
