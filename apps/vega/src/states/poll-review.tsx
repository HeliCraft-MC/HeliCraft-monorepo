import { useState } from 'react';
import type { ReactElement } from 'react';
import type { VotingInput } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { SurveyForm } from '../surveys/form';
import { VotingBallot } from './voting-ballot';
import { useTranslation } from '../i18n';
import { displayText, uiText } from './text';
import styles from './states.module.scss';
import { pollReadiness } from './poll-readiness';

function PollReview({ input }: Readonly<{ input: VotingInput }>): ReactElement {
  const { locale } = useTranslation();
  const issues = pollReadiness(input, locale);
  const [choices, setChoices] = useState<string[]>([]);
  return (
    <section className={styles.editor}>
      {issues.length > 0 && (
        <Alert tone="danger">
          <strong>{uiText(locale, 'Перед публикацией исправьте:', 'Before publishing:')}</strong>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </Alert>
      )}
      <Alert>
        {uiText(
          locale,
          'Это предпросмотр: ответы не отправляются. Проверьте вопросы и сроки. После публикации изменить их нельзя.',
          'Preview only: responses are not submitted. Check the questions and schedule before publishing; they become fixed.',
        )}
      </Alert>
      <h3>
        {displayText(input.title, locale) ||
          uiText(locale, 'Название пока не указано', 'Untitled poll')}
      </h3>
      <p className={styles.hint}>{displayText(input.description, locale)}</p>
      <p className={styles.hint}>
        {new Date(input.opensAt).toLocaleString(locale)} —{' '}
        {input.survey?.manualClose === true
          ? uiText(locale, 'До ручного закрытия', 'Until closed manually')
          : new Date(input.closesAt).toLocaleString(locale)}
      </p>
      {input.survey ? (
        <SurveyForm input={input} preview />
      ) : (
        <VotingBallot input={input} choices={choices} onChange={setChoices} disabled={false} />
      )}
    </section>
  );
}
export { PollReview };
