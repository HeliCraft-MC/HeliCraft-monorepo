// oxlint-disable import/max-dependencies -- Poll composition connects the typed form, content editors and publication workflow.
import { useMemo, useState, useCallback } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import type { VotingInput } from '@helicraft/alhena';
import {
  Alert,
  Button,
  Form,
  FormFields,
  Icon,
  StepNavigation,
  useFormModel,
  useFormStore,
} from '@helicraft/atria';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { formLanguages } from '../form-languages';
import { SurveyEditor } from '../surveys/editor';
import { PollQuestionsEditor } from './poll-questions-editor';
import { pollFormModel, initialPoll, draftInput } from './poll-form-model';
import { PollFormat } from './poll-format';
import { PollSettings } from './poll-settings';
import { pollReadiness } from './poll-readiness';
import { PollReview } from './poll-review';
import { usePollPersistence } from './use-poll-persistence';
import { uiText } from './text';
import styles from './states.module.scss';

function PollCreator({
  onCreated,
  draft,
}: Readonly<{ onCreated: () => void; draft?: { id: string; input: VotingInput } }>): ReactElement {
  const { locale } = useTranslation();
  const [step, setStep] = useState('content');
  const initial = useMemo(
    () => (draft === undefined ? initialPoll() : draftInput(draft.input)),
    [draft],
  );
  const model = useMemo(() => pollFormModel(initial, locale), [initial, locale]);
  // oxlint-disable-next-line no-use-before-define -- Submission runs after persistence initialization.
  const form = useFormModel({ model, onSubmit: publish });
  const input = useFormStore(form.store, (state) => state.values);
  const setInput = useCallback(
    (next: VotingInput): void => {
      form.setFieldValue('title', next.title);
      form.setFieldValue('description', next.description);
      form.setFieldValue('options', next.options);
      form.setFieldValue('questions', next.questions);
      form.setFieldValue('survey', next.survey);
      form.setFieldValue('opensAt', next.opensAt);
      form.setFieldValue('closesAt', next.closesAt);
      form.setFieldValue('electorate', next.electorate);
      form.setFieldValue('rules', next.rules);
      form.setFieldValue('maxSelections', next.maxSelections);
      form.setFieldValue('resultVisibility', next.resultVisibility);
    },
    [form],
  );
  const create = usePollPersistence(input, draft?.id, onCreated);
  function publish(): void {
    if (step === 'review' && pollReadiness(input, locale).length === 0) {
      create.mutate(true);
    } else {
      setStep(step === 'content' ? 'settings' : 'review');
    }
  }
  const save = useCallback((): void => {
    create.mutate(false);
  }, [create]);
  const next = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    setStep((current) => (current === 'content' ? 'settings' : 'review'));
  }, []);
  const back = useCallback((): void => {
    setStep((current) => (current === 'review' ? 'settings' : 'content'));
  }, []);
  const steps = useMemo(
    () => [
      { id: 'content', label: uiText(locale, 'Вопросы', 'Questions') },
      { id: 'settings', label: uiText(locale, 'Настройки', 'Settings') },
      { id: 'review', label: uiText(locale, 'Проверка', 'Review') },
    ],
    [locale],
  );
  return (
    <section className={styles.pollEditor}>
      <StepNavigation
        label={uiText(locale, 'Создание опроса', 'Create poll')}
        steps={steps}
        value={step}
        onChange={setStep}
      />
      <Form
        form={form}
        model={model}
        autoFields={false}
        languageSelectorVisible={step === 'content'}
        languages={formLanguages}
        defaultLanguage={locale}
        languageLabel={uiText(locale, 'Язык содержимого', 'Content language')}
        translationHint={uiText(
          locale,
          'Один язык для всех вопросов и ответов. Переключение сохраняет введённые переводы.',
          'One language for all questions and options. Switching preserves your translations.',
        )}
      >
        <div hidden={step !== 'content'} className={styles.pollStep}>
          <FormFields form={form} model={model} />
          <PollFormat input={input} onChange={setInput} />
          {input.survey ? (
            <SurveyEditor input={input} onChange={setInput} />
          ) : (
            <PollQuestionsEditor input={input} onChange={setInput} />
          )}
        </div>
        <div hidden={step !== 'settings'} className={styles.pollStep}>
          <PollSettings input={input} onChange={setInput} />
        </div>
        <div hidden={step !== 'review'} className={styles.pollStep}>
          {step === 'review' && <PollReview input={input} />}
        </div>
        {create.error !== null && <Alert tone="danger">{errorMessage(create.error)}</Alert>}
        <div className={styles.editorFooter}>
          <Button type="button" tone="quiet" disabled={create.isPending} onClick={save}>
            <Icon name="save" />
            {uiText(
              locale,
              draft === undefined ? 'Сохранить черновик опроса' : 'Сохранить изменения',
              draft === undefined ? 'Save poll draft' : 'Save changes',
            )}
          </Button>
          <div className={styles.actions}>
            {step !== 'content' && (
              <Button type="button" tone="quiet" onClick={back}>
                <Icon name="arrowLeft" />
                {uiText(locale, 'Назад', 'Back')}
              </Button>
            )}
            {step === 'review' ? (
              <Button
                key="publish"
                type="submit"
                disabled={create.isPending || pollReadiness(input, locale).length > 0}
              >
                <Icon name="vote" />
                {uiText(locale, 'Опубликовать опрос', 'Publish poll')}
              </Button>
            ) : (
              <Button key="continue" type="button" onClick={next}>
                {uiText(locale, 'Продолжить', 'Continue')}
                <Icon name="arrowRight" />
              </Button>
            )}
          </div>
        </div>
        {input.survey && (
          <output className={styles.hint} aria-live="polite">
            {uiText(
              locale,
              {
                idle: 'Автосохранение включено',
                saving: 'Сохранение…',
                saved: 'Черновик сохранён',
                error: 'Не удалось сохранить автоматически. Сохраните черновик вручную.',
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
      </Form>
    </section>
  );
}
export { PollCreator };
