import { useCallback, useMemo } from 'react';
import type { ChangeEvent, MouseEvent, ReactElement } from 'react';
import type { CompanyConfiguration, CompanyDraft, Principal } from '@helicraft/alhena';
import {
  Alert,
  Button,
  FieldHelp,
  FormField,
  TextField,
  WorkflowLayout,
  ActionPanel,
} from '@helicraft/atria';
import type { SelectedPlayer } from '../player-picker';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { useCompanyDraft } from './use-draft';
import { CompanyWizardStep } from './wizard-step';
import { companySaveStatus } from './wizard-labels';
import styles from './companies.module.scss';

const STEPS = [
  ['Основные данные', 'Identity'],
  ['Собственность', 'Ownership'],
  ['Управление', 'Governance'],
  ['Формальный устав', 'Formal charter'],
  ['Проверка и подача', 'Review and submit'],
] as const;
function CompanyWizard({
  initial,
  principal,
  players,
}: Readonly<{
  initial: CompanyDraft;
  principal: Principal;
  players: readonly SelectedPlayer[];
}>): ReactElement {
  const { locale } = useTranslation();
  const draft = useCompanyDraft(initial);
  const { fields, change, flush } = draft;
  const configuration = useCallback(
    (value: CompanyConfiguration): void => {
      change({ ...fields, configuration: value });
    },
    [fields, change],
  );
  const workflowSteps = useMemo(
    () =>
      STEPS.map((names, index) => ({
        id: String(index),
        label: `${index + 1}. ${uiText(locale, names[0], names[1])}`,
      })),
    [locale],
  );
  const selectStep = useCallback(
    (value: string): void => {
      change({ ...fields, step: Number(value) });
    },
    [fields, change],
  );
  const changeStepButton = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      selectStep(event.currentTarget.value);
    },
    [selectStep],
  );
  const title = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      change({ ...fields, title: event.currentTarget.value });
    },
    [fields, change],
  );
  const save = useCallback((): void => {
    async function persist(): Promise<void> {
      try {
        await flush();
      } catch {
        /* The persistent save status explains retry or optimistic conflict. */
      }
    }
    void persist();
  }, [flush]);
  return (
    <section className={styles.page}>
      <h1>{uiText(locale, 'Учреждение компании', 'Company formation')}</h1>
      <FieldHelp
        showLabel
        label={uiText(locale, 'Юридическое лицо и регистрация', 'Legal entity and registration')}
        content={uiText(
          locale,
          'После регистрации компания получает постоянную идентичность, собственность и счета, отдельные от заявителя. Правила выбранного государства определяют сбор и необходимость одобрения. Черновик сам по себе не создаёт действующих акций или полномочий.',
          'Registration gives the company a permanent identity, property and accounts separate from the applicant. The selected state sets fees and approval requirements. A draft alone creates no active shares or authority.',
        )}
      />
      <ActionPanel
        title={uiText(locale, 'Название и параметры черновика', 'Draft name and settings')}
      >
        <FormField
          label={uiText(locale, 'Название черновика (личное)', 'Private draft title')}
          htmlFor="company-draft-title"
        >
          <TextField
            id="company-draft-title"
            value={fields.title}
            maxLength={200}
            onChange={title}
          />
        </FormField>
      </ActionPanel>
      <output aria-live="polite">{companySaveStatus(draft.pending, draft.error, locale)}</output>
      {draft.error !== null && (
        <Alert tone="danger">
          {draft.error}{' '}
          <Button onClick={save}>{uiText(locale, 'Повторить сохранение', 'Retry saving')}</Button>
        </Alert>
      )}
      <WorkflowLayout
        label={uiText(locale, 'Учреждение компании', 'Company formation')}
        steps={workflowSteps}
        value={String(fields.step)}
        onChange={selectStep}
      >
        <h2>{workflowSteps[fields.step]?.label}</h2>
        <CompanyWizardStep
          step={fields.step}
          companyId={initial.companyId}
          configuration={fields.configuration}
          onChange={configuration}
          players={players}
          principal={principal}
          flush={flush}
        />
        <div className={styles.actions}>
          <Button
            tone="quiet"
            disabled={fields.step === 0}
            value={String(fields.step - 1)}
            onClick={changeStepButton}
          >
            {uiText(locale, 'Назад', 'Back')}
          </Button>
          {fields.step < STEPS.length - 1 && (
            <Button value={String(fields.step + 1)} onClick={changeStepButton}>
              {uiText(locale, 'Продолжить', 'Continue')}
            </Button>
          )}
        </div>
      </WorkflowLayout>
    </section>
  );
}
export { CompanyWizard };
