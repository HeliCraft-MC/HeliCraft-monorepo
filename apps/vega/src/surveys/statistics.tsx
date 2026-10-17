import { useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import type { VotingDetail } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import styles from './survey.module.scss';

const HUE_STEP = 67;
const PERCENT = 100;
function SurveyStatistics({ voting }: Readonly<{ voting: VotingDetail }>): ReactElement {
  const { locale } = useTranslation();
  const [pie, setPie] = useState(false);
  const toggle = useCallback((): void => {
    setPie((current) => !current);
  }, []);
  return (
    <section className={styles.editor}>
      <h3>{uiText(locale, 'Статистика анкеты', 'Survey statistics')}</h3>
      <p>
        {uiText(locale, 'Принято ответов', 'Responses received')}:{' '}
        {voting.result?.participating ?? 0}
      </p>
      <Button tone="quiet" onClick={toggle}>
        {uiText(locale, pie ? 'Столбцы' : 'Круговые диаграммы', pie ? 'Bars' : 'Pie charts')}
      </Button>
      {(voting.result?.survey ?? []).map((summary) => {
        const block = voting.input.survey?.blocks.find((item) => item.id === summary.questionId);
        const total = summary.options.reduce((sum, option) => sum + option.count, 0);
        let offset = 0;
        return (
          <section key={summary.questionId} className={styles.block}>
            <h4>{displayText(block?.title ?? {}, locale)}</h4>
            <p>
              {uiText(locale, 'Ответили на вопрос', 'Answered this question')}: {summary.answered}
            </p>
            {pie && total > 0 && (
              <svg
                viewBox="0 0 40 40"
                width="160"
                height="160"

                aria-label={displayText(block?.title ?? {}, locale)}
              >
                {summary.options.map((option, index) => {
                  const length = (option.count / total) * PERCENT;
                  const start = offset;
                  offset += length;
                  return (
                    <circle
                      key={option.id}
                      cx="20"
                      cy="20"
                      r="15.915494"
                      fill="none"
                      stroke={`hsl(${index * HUE_STEP},65%,60%)`}
                      strokeWidth="8"
                      strokeDasharray={`${length} ${PERCENT - length}`}
                      strokeDashoffset={-start}
                      transform="rotate(-90 20 20)"
                    />
                  );
                })}
              </svg>
            )}
            {summary.options.map((option) => (
              <div key={option.id} className={styles.chart}>
                <span>
                  {displayText(
                    voting.input.options.find((item) => item.id === option.id)?.label ?? {},
                    locale,
                  )}
                  : {option.count} (
                  {summary.answered === 0
                    ? 0
                    : Math.round((option.count / summary.answered) * PERCENT)}
                  %)
                </span>
                {!pie && (
                  <meter
                    aria-label={displayText(
                      voting.input.options.find((item) => item.id === option.id)?.label ?? {},
                      locale,
                    )}
                    min={0}
                    max={Math.max(1, summary.answered)}
                    value={option.count}
                  />
                )}
              </div>
            ))}
          </section>
        );
      })}
    </section>
  );
}
export { SurveyStatistics };
