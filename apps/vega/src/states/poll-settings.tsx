import { useCallback, useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { VotingInput, GovernanceVotingRules } from '@helicraft/alhena';
import { FormField, Select } from '@helicraft/atria';
import { PollSchedule } from './poll-schedule';
import { VotingRulesEditor } from './voting-rules';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './states.module.scss';

function PollSettings({
  input,
  onChange,
}: Readonly<{ input: VotingInput; onChange: (input: VotingInput) => void }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const rules = useCallback(
    (value: GovernanceVotingRules): void => {
      onChange({ ...input, rules: value });
    },
    [input, onChange],
  );
  const visibility = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const resultVisibility = event.currentTarget.value;
      if (
        resultVisibility === 'PUBLIC' ||
        resultVisibility === 'AFTER_CLOSE' ||
        resultVisibility === 'ELIGIBLE_ONLY'
      ) {
        onChange({ ...input, resultVisibility });
      }
    },
    [input, onChange],
  );
  return (
    <section className={styles.editor}>
      <h3>{uiText(locale, 'Сроки, правила и публикация', 'Schedule, rules and publication')}</h3>
      <p className={styles.hint}>
        {uiText(
          locale,
          'Время указано в часовом поясе вашего устройства. После публикации вопросы и правила изменить нельзя.',
          'Times use your device’s time zone. Questions and rules cannot change after publication.',
        )}
      </p>
      <PollSchedule input={input} onChange={onChange} />
      {!input.survey && (
        <VotingRulesEditor showDuration={false} value={input.rules} onChange={rules} />
      )}
      <FormField
        htmlFor={id}
        label={uiText(locale, 'Видимость результатов', 'Results visibility')}
        hint={uiText(
          locale,
          'Администраторы могут проверять результаты при любом режиме.',
          'Administrators can review results in every mode.',
        )}
      >
        <Select id={id} value={input.resultVisibility} onChange={visibility}>
          <option value="PUBLIC">{uiText(locale, 'Сразу всем', 'Public immediately')}</option>
          <option value="AFTER_CLOSE">{uiText(locale, 'После завершения', 'After close')}</option>
          <option value="ELIGIBLE_ONLY">
            {uiText(locale, 'Только избирателям', 'Eligible voters only')}
          </option>
        </Select>
      </FormField>
    </section>
  );
}
export { PollSettings };
