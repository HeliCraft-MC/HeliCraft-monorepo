// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
import { OfficeAssignments } from './office-assignments';
import { uiText } from './text';
import { EDIT_STEPS } from './wizard-steps';
import { useMemo, useState } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { changeStateStatus, adminOverrideState } from '@helicraft/alhena';
import type { Principal, StateConfiguration, StateDetail } from '@helicraft/alhena';
import { Alert, Button, FormField, Textarea } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { StateDetailView } from './detail';
import { StateWizardStep } from './wizard-step';
import styles from './states.module.scss';

// oxlint-disable-next-line max-lines-per-function -- Bounded declarative form composition keeps labels, fields and actions together; persistence and domain validation are separate.
function AdminStateEditor({
  state,
  principal,
}: Readonly<{ state: StateDetail; principal: Principal }>): ReactElement {
  const { locale } = useTranslation();
  const [configuration, setConfiguration] = useState<StateConfiguration>(state.configuration);
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState(false);
  const [cofounders, setCofounders] = useState(
    state.founders
      .filter((founder) => founder.type === 'COFOUNDER')
      .map((founder) => ({ id: founder.id, name: founder.name })),
  );
  const queryClient = useQueryClient();
  const primary = state.founders.find((founder) => founder.type === 'PRIMARY');
  const creator = useMemo(
    () => (primary ? { ...principal, id: primary.id, username: primary.name } : principal),
    [primary, principal],
  );
  const mutation = useMutation({
    mutationFn: async (status: StateDetail['status']) => {
      await changeStateStatus({
        client: browserClient(),
        path: { id: state.id },
        body: { status, reason },
        throwOnError: true,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-state', state.id] });
    },
  });
  const edit = useMutation({
    mutationFn: async () => {
      await adminOverrideState({
        client: browserClient(),
        path: { id: state.id },
        body: { configuration, reason, baseRevisionId: state.governanceRevisionId },
        throwOnError: true,
      });
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-state', state.id] });
    },
  });
  const callbackScope2 = useMemo(
    () => [
      state,
      principal,
      locale,
      configuration,
      setConfiguration,
      step,
      setStep,
      reason,
      setReason,
      editing,
      setEditing,
      cofounders,
      setCofounders,
      queryClient,
      primary,
      creator,
      mutation.mutate,
      edit.mutate,
    ],
    [
      state,
      principal,
      locale,
      configuration,
      setConfiguration,
      step,
      setStep,
      reason,
      setReason,
      editing,
      setEditing,
      cofounders,
      setCofounders,
      queryClient,
      primary,
      creator,
      mutation.mutate,
      edit.mutate,
    ],
  );
  const cacheTextareaOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Textarea>['onChange']>>(callbackScope2);
  const cacheButtonOnClick =
    usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(callbackScope2);
  return (
    <section className={styles.page}>
      <StateDetailView
        state={state}
        flagUrl={`/api/v1/admin/states/${state.id}/flag`}
        backHref="/admin/states"
        backLabel={uiText(locale, 'Все государства', 'All states')}
      />
      <details>
        <summary>{uiText(locale, 'Все переводы', 'All translations')}</summary>
        {(['ru', 'en'] as const).map((code) => (
          <section key={code}>
            <h3>{code.toUpperCase()}</h3>
            <p>{state.configuration.name[code] ?? '—'}</p>
            <p>{state.configuration.description[code] ?? '—'}</p>
            {state.configuration.governance.offices.map((office) => (
              <p key={office.id}>
                {office.name[code] ?? '—'} — {office.description[code] ?? '—'}
              </p>
            ))}
            {state.configuration.constitution && (
              <>
                <h4>{state.configuration.constitution.title[code] ?? '—'}</h4>
                {state.configuration.constitution.blocks
                  .filter((block) => block.type === 'MARKDOWN')
                  .map((block) => (
                    <p key={block.id}>{block.content[code] ?? '—'}</p>
                  ))}
              </>
            )}
          </section>
        ))}
      </details>
      <FormField
        htmlFor="admin-state-reason"
        label={uiText(
          locale,
          'Причина решения или исправления',
          'Reason for decision or correction',
        )}
      >
        <Textarea
          id="admin-state-reason"
          value={reason}
          onChange={cacheTextareaOnChange('5058', (event) => {
            setReason(event.currentTarget.value);
          })}
          required
        />
      </FormField>
      <div className={styles.actions}>
        {state.status === 'CREATED' && (
          <>
            <Button
              disabled={reason.trim() === '' || mutation.isPending}
              onClick={cacheButtonOnClick('5387', () => {
                mutation.mutate('ACTIVE');
              })}
            >
              {uiText(locale, 'Одобрить', 'Approve')}
            </Button>
            <Button
              tone="quiet"
              disabled={reason.trim() === '' || mutation.isPending}
              onClick={cacheButtonOnClick('5686', () => {
                mutation.mutate('REJECTED');
              })}
            >
              {uiText(locale, 'Отклонить', 'Reject')}
            </Button>
          </>
        )}
        {state.status === 'ACTIVE' && (
          <Button
            disabled={reason.trim() === '' || mutation.isPending}
            onClick={cacheButtonOnClick('6019', () => {
              mutation.mutate('SUSPENDED');
            })}
          >
            {uiText(locale, 'Приостановить', 'Suspend')}
          </Button>
        )}
        {state.status === 'SUSPENDED' && (
          <Button
            disabled={reason.trim() === '' || mutation.isPending}
            onClick={cacheButtonOnClick('6337', () => {
              mutation.mutate('ACTIVE');
            })}
          >
            {uiText(locale, 'Восстановить', 'Restore')}
          </Button>
        )}
        <Button
          tone="quiet"
          onClick={cacheButtonOnClick('6561', () => {
            setEditing(!editing);
          })}
        >
          {uiText(locale, 'Исправить конфигурацию', 'Correct configuration')}
        </Button>
      </div>
      {editing && (
        <section className={styles.editor}>
          <Alert>
            {uiText(
              locale,
              'Исправление создаст новую редакцию с причиной. Старые редакции сохранятся.',
              'A correction creates a new revision with a reason. Previous revisions remain unchanged.',
            )}
          </Alert>
          <nav className={styles.actions}>
            {EDIT_STEPS.map((item) => (
              <Button
                key={item}
                tone="quiet"
                onClick={cacheButtonOnClick(rowKey('7280', item), () => {
                  setStep(item);
                })}
              >
                {uiText(locale, 'Шаг', 'Step')} {item}
              </Button>
            ))}
          </nav>
          <StateWizardStep
            step={step}
            configuration={configuration}
            stableSlug
            onStepChange={setStep}
            onChange={setConfiguration}
            principal={creator}
            cofounders={cofounders}
            setCofounders={setCofounders}
          />
          <Button
            disabled={reason.trim() === '' || edit.isPending}
            onClick={cacheButtonOnClick('7828', () => {
              edit.mutate();
            })}
          >
            {uiText(
              locale,
              'Сохранить исправление новой редакцией',
              'Save correction as a new revision',
            )}
          </Button>
        </section>
      )}
      {[mutation.error, edit.error]
        .filter((error) => error !== null)
        .map((error) => (
          <Alert key={errorMessage(error)} tone="danger">
            {errorMessage(error)}
          </Alert>
        ))}
      {state.status === 'ACTIVE' && <OfficeAssignments state={state} />}
    </section>
  );
}
export { AdminStateEditor };
