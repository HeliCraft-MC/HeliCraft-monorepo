// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
import { PollSchedule } from './poll-schedule';
import { SurveyEditor } from '../surveys/editor';
import { SurveyForm } from '../surveys/form';
import { newBlock } from '../surveys/model';
import { uiText } from './text';
import { PollQuestionsEditor } from './poll-questions-editor';
import { useMemo, useState, useId, useCallback } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache } from './use-prop-cache';
import { usePollPersistence } from './use-poll-persistence';
import type { VotingInput } from '@helicraft/alhena';
import { Alert, Button, FormField, Select } from '@helicraft/atria';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { LocalizedInputField } from './localized-input';
import { VotingRulesEditor } from './voting-rules';

import styles from './states.module.scss';

const HOUR_MS = 3_600_000;
function initialPoll(): VotingInput {
  const options = [
    { id: crypto.randomUUID(), label: {} },
    { id: crypto.randomUUID(), label: {} },
  ];
  return {
    questions: [
      {
        id: crypto.randomUUID(),
        title: {},
        optionIds: options.map((option) => option.id),
        maxSelections: 1,
      },
    ],
    title: {},
    description: {},
    options,
    opensAt: new Date().toISOString(),
    closesAt: new Date(Date.now() + HOUR_MS).toISOString(),
    electorate: { type: 'GLOBAL_USERS' },
    rules: {
      durationHours: 24,
      quorumPercent: 0,
      thresholdPercent: 50,
      thresholdKind: 'PERCENT',
      allowAbstain: true,
    },
    maxSelections: 1,
    resultVisibility: 'AFTER_CLOSE',
  };
}
function draftInput(input: VotingInput): VotingInput {
  return {
    ...input,
    questions: input.survey
      ? undefined
      : (input.questions ?? [
          {
            id: crypto.randomUUID(),
            title: input.title,
            optionIds: input.options.map((option) => option.id),
            maxSelections: input.maxSelections,
          },
        ]),
  };
}
// oxlint-disable-next-line max-lines-per-function -- The editor composes both poll formats and their shared publication settings.
function PollCreator({
  onCreated,
  draft,
}: Readonly<{ onCreated: () => void; draft?: { id: string; input: VotingInput } }>): ReactElement {
  const { locale } = useTranslation();
  const idPrefix = useId();
  const [preview, setPreview] = useState(false);
  const [input, setInput] = useState(() =>
    draft === undefined ? initialPoll() : draftInput(draft.input),
  );
  const saved = useCallback((): void => {
    setInput(initialPoll());
    onCreated();
  }, [onCreated]);
  const create = usePollPersistence(input, draft?.id, saved);
  const callbackScope1 = useMemo(
    () => [onCreated, locale, input, setInput, create.mutate, preview],
    [onCreated, locale, input, setInput, create.mutate, preview],
  );
  const cacheLocalizedInputFieldOnChange =
    usePropCache<NonNullable<ComponentProps<typeof LocalizedInputField>['onChange']>>(
      callbackScope1,
    );
  const cacheButtonOnClick =
    usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(callbackScope1);
  const cacheVotingRulesEditorOnChange =
    usePropCache<NonNullable<ComponentProps<typeof VotingRulesEditor>['onChange']>>(callbackScope1);
  const cacheSelectOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Select>['onChange']>>(callbackScope1);
  return (
    <section className={styles.card}>
      <h2>
        {uiText(
          locale,
          draft === undefined ? 'Новый глобальный опрос' : 'Редактирование опроса',
          draft === undefined ? 'New global poll' : 'Edit poll',
        )}
      </h2>
      <p className={styles.hint}>
        {uiText(
          locale,
          'Добавьте один или несколько вопросов, настройте сроки и сохраните черновик. После публикации ответы принимаются одним бюллетенем; вопросы не меняются.',
          'Add one or more questions, choose a schedule and save a draft. After publication, answers are submitted as one ballot and questions remain fixed.',
        )}
      </p>
      <FormField
        htmlFor={`${idPrefix}-mode`}
        label={uiText(locale, 'Формат опроса', 'Poll format')}
      >
        <Select
          id={`${idPrefix}-mode`}
          value={input.survey ? 'SURVEY' : 'VOTE'}
          onChange={cacheSelectOnChange('mode', (event) => {
            if (event.currentTarget.value === 'SURVEY') {
              setInput({
                ...input,
                questions: undefined,
                options: [],
                survey: { blocks: [newBlock()], oneResponsePerUser: true },
              });
            } else {
              const next = initialPoll();
              setInput({
                ...next,
                title: input.title,
                description: input.description,
                opensAt: input.opensAt,
                closesAt: input.closesAt,
              });
            }
          })}
        >
          <option value="VOTE">
            {uiText(locale, 'Голосование с вариантами', 'Choice voting')}
          </option>
          <option value="SURVEY">
            {uiText(locale, 'Анкета — конструктор блоков', 'Survey — block editor')}
          </option>
        </Select>
      </FormField>
      <LocalizedInputField
        label={uiText(locale, 'Название опроса', 'Poll title')}
        value={input.title}
        onChange={cacheLocalizedInputFieldOnChange('2182', (title) => {
          setInput({ ...input, title });
        })}
      />
      <LocalizedInputField
        label={uiText(locale, 'Описание опроса', 'Poll description')}
        value={input.description}
        onChange={cacheLocalizedInputFieldOnChange('2408', (description) => {
          setInput({ ...input, description });
        })}
        multiline
      />
      {input.survey ? (
        <>
          <Button
            tone="quiet"
            onClick={cacheButtonOnClick('preview', () => {
              setPreview(!preview);
            })}
          >
            {uiText(
              locale,
              preview ? 'Вернуться к редактору' : 'Предпросмотр анкеты',
              preview ? 'Back to editor' : 'Preview survey',
            )}
          </Button>
          {preview ? (
            <SurveyForm key="preview" input={input} preview />
          ) : (
            <SurveyEditor input={input} onChange={setInput} />
          )}
        </>
      ) : (
        <PollQuestionsEditor input={input} onChange={setInput} />
      )}
      <PollSchedule input={input} onChange={setInput} />
      {!input.survey && (
        <VotingRulesEditor
          showDuration={false}
          value={input.rules}
          onChange={cacheVotingRulesEditorOnChange('5002', (rules) => {
            setInput({ ...input, rules });
          })}
        />
      )}
      <FormField
        htmlFor={`${idPrefix}-poll-results`}
        label={uiText(locale, 'Видимость результатов', 'Results visibility')}
        help={uiText(
          locale,
          'Выберите, когда участники смогут увидеть подсчёт: сразу, после завершения или только если они входят в список избирателей. Администраторы могут просматривать результаты для проверки.',
          'Choose when participants can see totals: immediately, after closing, or only if they are eligible voters. Administrators can review results.',
        )}
      >
        <Select
          id={`${idPrefix}-poll-results`}
          value={input.resultVisibility}
          onChange={cacheSelectOnChange('5318', (event) => {
            const resultVisibility = event.currentTarget.value;
            if (
              resultVisibility === 'PUBLIC' ||
              resultVisibility === 'AFTER_CLOSE' ||
              resultVisibility === 'ELIGIBLE_ONLY'
            ) {
              setInput({ ...input, resultVisibility });
            }
          })}
        >
          <option value="PUBLIC">{uiText(locale, 'Сразу всем', 'Public immediately')}</option>
          <option value="AFTER_CLOSE">{uiText(locale, 'После завершения', 'After close')}</option>
          <option value="ELIGIBLE_ONLY">
            {uiText(locale, 'Только избирателям', 'Eligible voters only')}
          </option>
        </Select>
      </FormField>
      <div className={styles.actions}>
        <Button
          disabled={create.isPending}
          onClick={cacheButtonOnClick('6124', () => {
            create.mutate(true);
          })}
        >
          {uiText(locale, 'Опубликовать опрос', 'Publish poll')}
        </Button>
        <Button
          tone="quiet"
          disabled={create.isPending}
          onClick={cacheButtonOnClick('save-poll-draft', () => {
            create.mutate(false);
          })}
        >
          {uiText(
            locale,
            draft === undefined ? 'Сохранить черновик опроса' : 'Сохранить изменения',
            draft === undefined ? 'Save poll draft' : 'Save changes',
          )}
        </Button>
      </div>
      {input.survey && (
        <output>
          {uiText(
            locale,
            {
              idle: 'Автосохранение включено',
              saving: 'Сохранение…',
              saved: 'Черновик сохранён',
              error: 'Не удалось сохранить автоматически. Нажмите «Сохранить черновик».',
            }[create.autosaveStatus],
            {
              idle: 'Autosave enabled',
              saving: 'Saving…',
              saved: 'Draft saved',
              error: 'Autosave failed. Save the draft manually.',
            }[create.autosaveStatus],
          )}
        </output>
      )}
      {create.error !== null && <Alert tone="danger">{errorMessage(create.error)}</Alert>}
    </section>
  );
}
export { PollCreator };
