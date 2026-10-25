// oxlint-disable max-lines -- Cohesive domain contract or composed editor; validation, persistence and individual controls are separate modules.
// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
import { uiText } from './text';
import { useMemo, useState, useCallback } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useBlocker } from '@tanstack/react-router';
import {
  submitStateDraft,
  validateStateDraft,
  startStateReformVote,
  publishStateReform,
  approveStateReformOffice,
  proposeStateReform,
} from '@helicraft/alhena';
import type {
  Principal,
  StateDraft,
  StateDetail,
  ValidateStateDraftResponse,
} from '@helicraft/alhena';
import { Alert, Button, FormField, TextField, WorkflowLayout, ActionPanel } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import type { SelectedPlayer } from '../player-picker';
import { useTranslation } from '../i18n';
import { DraftIssues } from './draft-issues';
import { StateWizardStep } from './wizard-step';
import { useDraft } from './use-draft';
import styles from './states.module.scss';

function saveStatusText(status: string, locale: 'ru' | 'en'): string {
  if (status === 'SAVED') {
    return uiText(locale, 'Сохранено', 'Saved');
  }
  if (status === 'SAVING') {
    return uiText(locale, 'Сохранение…', 'Saving…');
  }
  return uiText(locale, 'Ошибка сохранения', 'Save failed');
}
const stepNames = [
  ['Основные данные', 'Basic information'],
  ['Флаги', 'Flags'],
  ['Основатели', 'Founders'],
  ['Гражданство', 'Citizenship'],
  ['Шаблон и режим', 'Preset and mode'],
  ['Должности', 'Offices'],
  ['Назначения и сроки', 'Appointments and terms'],
  ['Полномочия по гражданству', 'Citizenship authority'],
  ['Государственные решения', 'State decisions'],
  ['Голосования', 'Voting'],
  ['Конституция', 'Constitution'],
  ['Проверка', 'Review'],
] as const;
const PEOPLE_START = 2;
const GOVERNMENT_START = 4;
const RULES_START = 9;
function stepGroup(index: number, locale: 'ru' | 'en'): string {
  if (index < PEOPLE_START) {
    return uiText(locale, 'Облик', 'Identity');
  }
  if (index < GOVERNMENT_START) {
    return uiText(locale, 'Участники', 'People');
  }
  if (index < RULES_START) {
    return uiText(locale, 'Устройство и полномочия', 'Government and authority');
  }
  return uiText(locale, 'Правила и публикация', 'Rules and publication');
}
// oxlint-disable-next-line max-lines-per-function, max-statements -- This composition keeps one atomic workflow or bounded declarative editor together.
function DraftEditor({
  initial,
  principal,
  players,
  currentState,
}: Readonly<{
  initial: StateDraft;
  principal: Principal;
  players: SelectedPlayer[];
  currentState: StateDetail | null;
}>): ReactElement {
  const { locale } = useTranslation();
  const draft = useDraft(initial);
  const { flush: flushDraft, setConfiguration: handleConfiguration } = draft;
  const shouldBlockNavigation = useCallback(async (): Promise<boolean> => {
    try {
      await flushDraft();
      return false;
    } catch {
      return true;
    }
  }, [flushDraft]);
  useBlocker({ shouldBlockFn: shouldBlockNavigation, enableBeforeUnload: false });
  const navigate = useNavigate();
  const [cofounders, setCofounders] = useState(players);
  const [issues, setIssues] = useState<ValidateStateDraftResponse['issues']>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const primary = currentState?.founders.find((founder) => founder.type === 'PRIMARY');
  const creator = useMemo(
    () =>
      primary === undefined ? principal : { ...principal, id: primary.id, username: primary.name },
    [principal, primary],
  );
  const existingOfficeIds = useMemo(
    () => currentState?.configuration.governance.offices.map((office) => office.id),
    [currentState],
  );
  const amendment = currentState?.configuration.governance.policies.find(
    (policy) => policy.action === 'AMEND_GOVERNANCE',
  );
  const approvalOffices = useMemo(
    () =>
      currentState?.configuration.governance.offices.filter(
        (office) =>
          amendment?.officeIds.includes(office.id) === true &&
          currentState.holders.some(
            (holder) => holder.officeId === office.id && holder.userId === principal.id,
          ),
      ) ?? [],
    [currentState, amendment, principal.id],
  );
  const requiresVote =
    amendment !== undefined &&
    ['CITIZEN_VOTE', 'COUNCIL_VOTE', 'COMBINED'].includes(amendment.mechanism);
  const { setStep: handleStepChange } = draft;
  const step = Math.max(1, draft.step);
  const workflowSteps = useMemo(
    () =>
      stepNames.map((names, index) => ({
        id: String(index + 1),
        label: `${index + 1}. ${names[locale === 'ru' ? 0 : 1]}`,
        group: stepGroup(index, locale),
      })),
    [locale],
  );
  const selectStep = useCallback(
    (value: string): void => {
      handleStepChange(Number(value));
    },
    [handleStepChange],
  );

  const submit = useMutation({
    mutationFn: async () => {
      const version = await draft.flush();
      const validation = await validateStateDraft({
        client: browserClient(),
        path: { id: initial.id },
        throwOnError: true,
      });
      setIssues(validation.data.issues);
      if (validation.data.issues.some((issue) => issue.severity === 'ERROR')) {
        return;
      }
      if (initial.stateId === null) {
        const result = await submitStateDraft({
          client: browserClient(),
          path: { id: initial.id },
          body: { version },
          throwOnError: true,
        });
        await navigate({ to: '/app/states/$stateId', params: { stateId: result.data.stateId } });
      } else {
        await publishStateReform({
          client: browserClient(),
          path: { id: initial.id },
          body: { version },
          throwOnError: true,
        });
        await navigate({ to: '/app/states/$stateId', params: { stateId: initial.stateId } });
      }
    },
  });
  const validate = useMutation({
    mutationFn: async () => {
      await draft.flush();
      const result = await validateStateDraft({
        client: browserClient(),
        path: { id: initial.id },
        throwOnError: true,
      });
      setIssues(result.data.issues);
    },
  });
  const vote = useMutation({
    mutationFn: async () => {
      const version = await draft.flush();
      await startStateReformVote({
        client: browserClient(),
        path: { id: initial.id },
        body: { version },
        throwOnError: true,
      });
      setNotice(
        uiText(
          locale,
          'Голосование опубликовано в разделе «Голосования».',
          'The vote is available in the Voting section.',
        ),
      );
    },
  });
  const proposal = useMutation({
    mutationFn: async () => {
      const version = await draft.flush();
      await proposeStateReform({
        client: browserClient(),
        path: { id: initial.id },
        body: { version },
        throwOnError: true,
      });
      setNotice(
        uiText(
          locale,
          'Предложение отправлено на рассмотрение. Должностные лица могут открыть его в разделе государства.',
          'Proposal submitted for review. Office holders can open it in the state section.',
        ),
      );
    },
  });
  const approve = useMutation({
    mutationFn: async (officeId: string) => {
      const version = await draft.flush();
      await approveStateReformOffice({
        client: browserClient(),
        path: { id: initial.id },
        body: { version, ownerId: initial.ownerId, officeId },
        throwOnError: true,
      });
      setNotice(uiText(locale, 'Одобрение записано', 'Approval recorded'));
    },
  });
  const callbackScope1 = useMemo(
    () => [
      initial,
      principal,
      players,
      locale,
      draft.configuration,
      draft.title,
      draft.step,
      draft.version,
      draft.flush,
      navigate,
      cofounders,
      setCofounders,
      issues,
      setIssues,
      notice,
      setNotice,
      step,
      currentState,
      amendment,
      requiresVote,
      approvalOffices,
      creator,
      submit.mutate,
      validate.mutate,
      vote.mutate,
      approve.mutate,
      proposal.mutate,
    ],
    [
      initial,
      principal,
      players,
      locale,
      draft.configuration,
      draft.title,
      draft.step,
      draft.version,
      draft.flush,
      navigate,
      cofounders,
      setCofounders,
      issues,
      setIssues,
      notice,
      setNotice,
      step,
      currentState,
      amendment,
      requiresVote,
      approvalOffices,
      creator,
      submit.mutate,
      validate.mutate,
      vote.mutate,
      approve.mutate,
      proposal.mutate,
    ],
  );
  const cacheTextFieldOnChange =
    usePropCache<NonNullable<ComponentProps<typeof TextField>['onChange']>>(callbackScope1);
  const cacheButtonOnClick =
    usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(callbackScope1);
  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <h1>
          {initial.stateId === null
            ? uiText(locale, 'Создание государства', 'Create a state')
            : uiText(locale, 'Черновик реформы', 'Reform draft')}
        </h1>
        <output aria-live="polite">{saveStatusText(draft.status, locale)}</output>
      </div>
      <ActionPanel
        title={uiText(locale, 'Название и параметры черновика', 'Draft name and settings')}
      >
        <FormField
          htmlFor="state-draft-title"
          label={uiText(locale, 'Название черновика', 'Draft title')}
        >
          <TextField
            id="state-draft-title"
            value={draft.title}
            onChange={cacheTextFieldOnChange('5002', (event) => {
              draft.setTitle(event.currentTarget.value);
            })}
          />
        </FormField>
      </ActionPanel>
      {draft.error !== null && (
        <Alert tone="danger">
          {draft.error}{' '}
          <Button
            tone="quiet"
            onClick={cacheButtonOnClick('5269', () => {
              globalThis.location.reload();
            })}
          >
            {uiText(locale, 'Загрузить актуальную версию', 'Reload latest version')}
          </Button>
        </Alert>
      )}
      <WorkflowLayout
        label={uiText(
          locale,
          initial.stateId === null ? 'Учреждение государства' : 'Подготовка реформы',
          initial.stateId === null ? 'State formation' : 'Prepare reform',
        )}
        steps={workflowSteps}
        value={String(step)}
        onChange={selectStep}
      >
        <h2>{stepNames[step - 1]?.[locale === 'ru' ? 0 : 1]}</h2>
        <fieldset disabled={submit.isPending} className={styles.localized}>
          <StateWizardStep
            step={step}
            configuration={draft.configuration}
            existingOfficeIds={existingOfficeIds}
            holderCandidates={currentState?.citizens}
            stableSlug={initial.stateId !== null}
            onStepChange={handleStepChange}
            onChange={handleConfiguration}
            principal={creator}
            cofounders={cofounders}
            setCofounders={setCofounders}
          />
        </fieldset>
        {step === stepNames.length && (
          <>
            <Button
              tone="quiet"
              disabled={validate.isPending}
              onClick={cacheButtonOnClick('6552', () => {
                validate.mutate();
              })}
            >
              {uiText(locale, 'Проверить конфигурацию', 'Validate configuration')}
            </Button>
            <DraftIssues issues={issues} onStepChange={handleStepChange} />
            {initial.stateId !== null && (
              <div className={styles.actions}>
                <Button
                  onClick={cacheButtonOnClick('propose', () => {
                    proposal.mutate();
                  })}
                  disabled={proposal.isPending}
                >
                  {uiText(locale, 'Отправить на рассмотрение', 'Submit for review')}
                </Button>
                {requiresVote && (
                  <Button
                    onClick={cacheButtonOnClick('7413', () => {
                      vote.mutate();
                    })}
                  >
                    {uiText(
                      locale,
                      'Начать голосование по действующей процедуре',
                      'Start voting under current governance',
                    )}
                  </Button>
                )}
                {approvalOffices.map((office) => (
                  <Button
                    key={office.id}
                    tone="quiet"
                    onClick={cacheButtonOnClick(rowKey('7861', office), () => {
                      approve.mutate(office.id);
                    })}
                  >
                    {uiText(locale, 'Одобрить от должности', 'Approve as office')}:{' '}
                    {office.name[locale] ?? office.name.en ?? office.name.ru ?? ''}
                  </Button>
                ))}
              </div>
            )}
            <Button
              disabled={submit.isPending || issues.some((issue) => issue.severity === 'ERROR')}
              onClick={cacheButtonOnClick('8336', () => {
                submit.mutate();
              })}
            >
              {initial.stateId === null
                ? uiText(locale, 'Создать государство', 'Create state')
                : uiText(locale, 'Опубликовать одобренную реформу', 'Publish approved reform')}
            </Button>
          </>
        )}
        {[submit.error, validate.error, vote.error, approve.error, proposal.error]
          .filter((error) => error !== null)
          .map((error) => (
            <Alert key={errorMessage(error)} tone="danger">
              {errorMessage(error)}
            </Alert>
          ))}
        {notice !== null && <Alert>{notice}</Alert>}
        <div className={styles.actions}>
          <Button
            tone="quiet"
            disabled={step === 1}
            onClick={cacheButtonOnClick('9156', () => {
              draft.setStep(step - 1);
            })}
          >
            {uiText(locale, 'Назад', 'Back')}
          </Button>
          <Button
            disabled={step === stepNames.length}
            onClick={cacheButtonOnClick('9371', () => {
              draft.setStep(step + 1);
            })}
          >
            {uiText(locale, 'Далее', 'Next')}
          </Button>
        </div>
      </WorkflowLayout>
    </section>
  );
}
export { DraftEditor };
