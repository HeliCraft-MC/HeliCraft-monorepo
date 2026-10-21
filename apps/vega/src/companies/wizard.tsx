// oxlint-disable import/max-dependencies -- The wizard connects versioned persistence, step navigation and typed product editors while keeping registration and authority in Antares.
import { useCallback, useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyConfiguration, CompanyDraft, Principal } from '@helicraft/alhena';
import { Alert, Button, FieldHelp, FormField, TextField } from '@helicraft/atria';
import type { SelectedPlayer } from '../player-picker';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
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
  const scope = useMemo(() => ({ fields, change }), [fields, change]);
  const click = usePropCache<() => void>(scope);
  const configuration = useCallback(
    (value: CompanyConfiguration): void => {
      change({ ...fields, configuration: value });
    },
    [fields, change],
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
        label={uiText(locale, 'Юридическое лицо и регистрация', 'Legal entity and registration')}
        content={uiText(
          locale,
          'После регистрации компания получает постоянную идентичность, собственность и счета, отдельные от заявителя. Правила выбранного государства определяют сбор и необходимость одобрения. Черновик сам по себе не создаёт действующих акций или полномочий.',
          'Registration gives the company a permanent identity, property and accounts separate from the applicant. The selected state sets fees and approval requirements. A draft alone creates no active shares or authority.',
        )}
      />
      <FormField
        label={uiText(locale, 'Название черновика (личное)', 'Private draft title')}
        htmlFor="company-draft-title"
      >
        <TextField id="company-draft-title" value={fields.title} maxLength={200} onChange={title} />
      </FormField>
      <output>{companySaveStatus(draft.pending, draft.error, locale)}</output>
      {draft.error !== null && (
        <Alert tone="danger">
          {draft.error}{' '}
          <Button onClick={save}>{uiText(locale, 'Повторить сохранение', 'Retry saving')}</Button>
        </Alert>
      )}
      <nav
        aria-label={uiText(locale, 'Шаги учреждения компании', 'Company formation steps')}
        className={styles.actions}
      >
        {STEPS.map((names, step) => (
          <Button
            key={names[1]}
            onClick={click(names[1], () => {
              change({ ...fields, step });
            })}
            aria-current={fields.step === step ? 'step' : undefined}
          >
            {step + 1}. {uiText(locale, names[0], names[1])}
          </Button>
        ))}
      </nav>
      <CompanyWizardStep
        step={fields.step}
        configuration={fields.configuration}
        onChange={configuration}
        players={players}
        principal={principal}
        flush={flush}
      />
    </section>
  );
}
export { CompanyWizard };
