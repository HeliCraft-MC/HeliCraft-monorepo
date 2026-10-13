// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
import { localDateTime, isoDateTime } from './time';
import { uiText } from './text';
import { MIN_POLL_OPTIONS } from './limits';
import { useMemo, useState } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';
import { useMutation } from '@tanstack/react-query';
import { createVoting, publishVoting } from '@helicraft/alhena';
import type { VotingInput } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField, Select } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { LocalizedInputField } from './localized-input';
import { VotingRulesEditor } from './voting-rules';

import styles from './states.module.scss';

const HOUR_MS = 3_600_000;
function initialPoll(): VotingInput {
  return {
    title: {},
    description: {},
    options: [
      { id: crypto.randomUUID(), label: {} },
      { id: crypto.randomUUID(), label: {} },
    ],
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
// oxlint-disable-next-line max-lines-per-function -- Bounded declarative form composition keeps labels, fields and actions together; persistence and domain validation are separate.
function PollCreator({ onCreated }: Readonly<{ onCreated: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const [input, setInput] = useState(initialPoll);
  const create = useMutation({
    mutationFn: async (publish: boolean) => {
      const result = await createVoting({
        client: browserClient(),
        body: input,
        throwOnError: true,
      });
      if (publish) {
        await publishVoting({
          client: browserClient(),
          path: { id: result.data.id },
          throwOnError: true,
        });
      }
      setInput(initialPoll());
      onCreated();
    },
  });
  const callbackScope1 = useMemo(
    () => [onCreated, locale, input, setInput, create.mutate],
    [onCreated, locale, input, setInput, create.mutate],
  );
  const cacheLocalizedInputFieldOnChange =
    usePropCache<NonNullable<ComponentProps<typeof LocalizedInputField>['onChange']>>(
      callbackScope1,
    );
  const cacheButtonOnClick =
    usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(callbackScope1);
  const cacheTextFieldOnChange =
    usePropCache<NonNullable<ComponentProps<typeof TextField>['onChange']>>(callbackScope1);
  const cacheVotingRulesEditorOnChange =
    usePropCache<NonNullable<ComponentProps<typeof VotingRulesEditor>['onChange']>>(callbackScope1);
  const cacheSelectOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Select>['onChange']>>(callbackScope1);
  return (
    <section className={styles.card}>
      <h2>{uiText(locale, 'Новый глобальный опрос', 'New global poll')}</h2>
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
      {input.options.map((option) => (
        <section key={option.id} className={styles.card}>
          <LocalizedInputField
            label={uiText(locale, 'Вариант ответа', 'Option label')}
            value={option.label}
            onChange={cacheLocalizedInputFieldOnChange(rowKey('2767', option), (value) => {
              setInput({
                ...input,
                options: input.options.map((item) =>
                  item.id === option.id ? { ...item, label: value } : item,
                ),
              });
            })}
          />
          <Button
            tone="quiet"
            disabled={input.options.length <= MIN_POLL_OPTIONS}
            onClick={cacheButtonOnClick(rowKey('3138', option), () => {
              setInput({
                ...input,
                options: input.options.filter((item) => item.id !== option.id),
              });
            })}
          >
            {uiText(locale, 'Удалить вариант', 'Remove option')}
          </Button>
        </section>
      ))}
      <Button
        tone="quiet"
        onClick={cacheButtonOnClick('3491', () => {
          setInput({
            ...input,
            options: [...input.options, { id: crypto.randomUUID(), label: {} }],
          });
        })}
      >
        {uiText(locale, 'Добавить вариант', 'Add option')}
      </Button>
      <FormField
        htmlFor="poll-open"
        label={uiText(locale, 'Начало голосования', 'Voting opens at')}
      >
        <TextField
          id="poll-open"
          type="datetime-local"
          value={localDateTime(input.opensAt)}
          onChange={cacheTextFieldOnChange('3963', (event) => {
            setInput({ ...input, opensAt: isoDateTime(event.currentTarget.value) });
          })}
        />
      </FormField>
      <FormField
        htmlFor="poll-close"
        label={uiText(locale, 'Завершение голосования', 'Voting closes at')}
      >
        <TextField
          id="poll-close"
          type="datetime-local"
          value={localDateTime(input.closesAt)}
          onChange={cacheTextFieldOnChange('4326', (event) => {
            setInput({ ...input, closesAt: isoDateTime(event.currentTarget.value) });
          })}
        />
      </FormField>
      <FormField
        htmlFor="poll-selections"
        label={uiText(locale, 'Максимум выбранных вариантов', 'Maximum selections')}
      >
        <TextField
          id="poll-selections"
          type="number"
          min={1}
          max={input.options.length}
          value={input.maxSelections}
          onChange={cacheTextFieldOnChange('4789', (event) => {
            setInput({ ...input, maxSelections: Number(event.currentTarget.value) });
          })}
        />
      </FormField>
      <VotingRulesEditor
        showDuration={false}
        value={input.rules}
        onChange={cacheVotingRulesEditorOnChange('5002', (rules) => {
          setInput({ ...input, rules });
        })}
      />
      <FormField
        htmlFor="poll-results"
        label={uiText(locale, 'Видимость результатов', 'Results visibility')}
      >
        <Select
          id="poll-results"
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
        {uiText(locale, 'Сохранить черновик опроса', 'Save poll draft')}
      </Button>
      {create.error !== null && <Alert tone="danger">{errorMessage(create.error)}</Alert>}
    </section>
  );
}
export { PollCreator };
