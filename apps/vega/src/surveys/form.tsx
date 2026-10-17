import { useState, useCallback } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import type { SurveyAnswer, VotingDetail, VotingInput } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { SurveyBlockContent } from './block-content';
import styles from './survey.module.scss';

function SurveyForm({
  input,
  pending = false,
  preview = false,
  onSubmit,
  html,
}: Readonly<{
  input: VotingInput;
  pending?: boolean;
  preview?: boolean;
  onSubmit?: (answers: SurveyAnswer[]) => void;
  html?: VotingDetail['surveyHtml'];
}>): ReactElement {
  const { locale } = useTranslation();
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [error, setError] = useState(false);
  const update = useCallback((questionId: string, value: SurveyAnswer['value']): void => {
    setAnswers((current) => [
      ...current.filter((answer) => answer.questionId !== questionId),
      { questionId, value },
    ]);
    setError(false);
  }, []);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const missing = input.survey?.blocks.some(
        (block) =>
          block.required &&
          !['TEXT_BLOCK', 'IMAGE_BLOCK'].includes(block.type) &&
          !answers.some((answer) => answer.questionId === block.id && answer.value.length > 0),
      );
      if (missing === true) {
        setError(true);
        return;
      }
      if (!pending && !preview) {
        onSubmit?.(answers);
      }
    },
    [input, answers, onSubmit, preview, pending],
  );
  return (
    <form onSubmit={submit} className={styles.editor}>
      <p>
        {uiText(
          locale,
          '* — обязательный вопрос. Администраторы видят автора и содержание ответа.',
          '* marks a required question. Administrators can see your identity and response.',
        )}
      </p>
      <fieldset disabled={pending} className={styles.editor}>
        <legend>{uiText(locale, 'Анкета', 'Survey')}</legend>
        {(input.survey?.blocks ?? []).map((block) => (
          <section key={block.id} className={styles.block}>
            {['TEXT_BLOCK', 'IMAGE_BLOCK'].includes(block.type) && (
              <h3>{displayText(block.title, locale)}</h3>
            )}
            <p className={styles.text}>{displayText(block.description, locale)}</p>
            <SurveyBlockContent
              block={block}
              input={input}
              value={answers.find((answer) => answer.questionId === block.id)?.value ?? ''}
              onChange={update}
              html={html}
            />
          </section>
        ))}
      </fieldset>
      {error && (
        <Alert tone="danger">
          {uiText(locale, 'Ответьте на обязательные вопросы.', 'Answer all required questions.')}
        </Alert>
      )}
      {!preview && (
        <Button type="submit" disabled={pending}>
          {uiText(locale, 'Отправить ответы', 'Submit responses')}
        </Button>
      )}
    </form>
  );
}
export { SurveyForm };
