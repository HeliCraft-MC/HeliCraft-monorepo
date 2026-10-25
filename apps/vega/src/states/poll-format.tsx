import { useCallback, useId, useRef } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { VotingInput } from '@helicraft/alhena';
import { FormField, Select } from '@helicraft/atria';
import { newBlock } from '../surveys/model';
import { initialPoll } from './poll-form-model';
import { useTranslation } from '../i18n';
import { uiText } from './text';

function PollFormat({
  input,
  onChange,
}: Readonly<{ input: VotingInput; onChange: (input: VotingInput) => void }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const vote = useRef<VotingInput | null>(null);
  const survey = useRef<VotingInput | null>(null);
  const change = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      if (input.survey) {
        survey.current = input;
      } else {
        vote.current = input;
      }
      const next =
        event.currentTarget.value === 'SURVEY'
          ? (survey.current ?? {
              ...input,
              questions: undefined,
              options: [],
              survey: { blocks: [newBlock()], oneResponsePerUser: true },
            })
          : (vote.current ?? initialPoll());
      onChange({
        ...next,
        title: input.title,
        description: input.description,
        opensAt: input.opensAt,
        closesAt: input.closesAt,
        rules: input.rules,
        resultVisibility: input.resultVisibility,
      });
    },
    [input, onChange],
  );
  return (
    <FormField
      htmlFor={id}
      label={uiText(locale, 'Формат опроса', 'Poll format')}
      hint={uiText(
        locale,
        'При переключении ваши вопросы сохраняются до закрытия редактора.',
        'Switching formats keeps your questions until you close the editor.',
      )}
    >
      <Select id={id} value={input.survey ? 'SURVEY' : 'VOTE'} onChange={change}>
        <option value="VOTE">{uiText(locale, 'Голосование с вариантами', 'Choice voting')}</option>
        <option value="SURVEY">
          {uiText(locale, 'Анкета — конструктор блоков', 'Survey — block editor')}
        </option>
      </Select>
    </FormField>
  );
}
export { PollFormat };
