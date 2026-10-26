// oxlint-disable import/max-dependencies -- The decision editor composes shared controls and the typed institution grouping.
import { STEPS } from './wizard-steps';
import { useMemo, useState, useCallback, useId } from 'react';
import type { ComponentProps, ReactElement, MouseEventHandler, ChangeEvent } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';

import { policyGroup } from './policy-groups';
import type { PolicyGroup } from './policy-groups';
import { Button, FormField, Select } from '@helicraft/atria';
import { label, uiText } from './text';
import { useTranslation } from '../i18n';

import { PolicyEditor } from './policy-editor';
import { actions, optionalActions, newPolicy, replacePolicy } from './policy-model';

import styles from './states.module.scss';
import type { StateWizardStepProps } from './wizard-types';

function PoliciesStep(props: StateWizardStepProps): ReactElement {
  const { step, configuration, onChange, principal, cofounders, setCofounders } = props;
  const { locale } = useTranslation();
  const id = useId();
  const [group, setGroup] = useState<PolicyGroup>('state');
  const selectGroup = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    const { value } = event.currentTarget;
    if (value === 'state' || value === 'bank' || value === 'tax') {
      setGroup(value);
    }
  }, []);

  const callbackScope = useMemo(
    () => [step, configuration, onChange, principal, cofounders, setCofounders, locale],
    [step, configuration, onChange, principal, cofounders, setCofounders, locale],
  );
  const cachePolicyEditorOnChange =
    usePropCache<NonNullable<ComponentProps<typeof PolicyEditor>['onChange']>>(callbackScope);
  const cacheConfigure = usePropCache<MouseEventHandler<HTMLButtonElement>>(callbackScope);
  return (
    <section className={styles.editor}>
      {step !== STEPS.CITIZENSHIP_AUTHORITY && (
        <>
          <FormField htmlFor={id} label={uiText(locale, 'Настройки решений', 'Decision settings')}>
            <Select id={id} value={group} onChange={selectGroup}>
              <option value="state">
                {uiText(locale, 'Общие государственные решения', 'General state decisions')}
              </option>
              <option value="bank">
                {uiText(locale, 'Институт: Центральный банк', 'Institution: Central bank')}
              </option>
              <option value="tax">
                {uiText(locale, 'Институт: Налоговая служба', 'Institution: Tax office')}
              </option>
            </Select>
          </FormField>
          <p>
            {uiText(
              locale,
              'Общее разрешение «Учреждение институтов» позволяет создать и банк, и налоговую службу. Остальные процедуры настраиваются отдельно в разделе выбранного института. Отсутствующая процедура запрещает соответствующее действие.',
              'The shared Establish institutions policy covers both the bank and tax office. Configure further procedures under the selected institution. A missing procedure denies its action.',
            )}
          </p>
        </>
      )}

      {actions
        .filter((action) =>
          step === STEPS.CITIZENSHIP_AUTHORITY
            ? action === 'ACCEPT_CITIZEN' || action === 'REMOVE_CITIZEN'
            : action !== 'ACCEPT_CITIZEN' &&
              action !== 'REMOVE_CITIZEN' &&
              policyGroup(action) === group,
        )
        .map((action) => {
          const existing = configuration.governance.policies.find((item) => item.action === action);
          if (existing === undefined && optionalActions.some((optional) => optional === action)) {
            return (
              <section className={styles.card} key={action}>
                <h3>{label(action, locale)}</h3>
                <p>
                  {uiText(
                    locale,
                    'Процедура не настроена. Действие запрещено до принятия реформы.',
                    'No policy is configured. This action is denied until a reform is approved.',
                  )}
                </p>
                <Button
                  type="button"
                  onClick={cacheConfigure(rowKey('monetary-policy', action), () => {
                    onChange({
                      ...configuration,
                      governance: {
                        ...configuration.governance,
                        policies: replacePolicy(
                          configuration.governance.policies,
                          newPolicy(action),
                        ),
                      },
                    });
                  })}
                >
                  {uiText(locale, 'Настроить процедуру', 'Configure procedure')}
                </Button>
              </section>
            );
          }
          const policy =
            configuration.governance.policies.find((item) => item.action === action) ??
            newPolicy(action);
          return (
            <PolicyEditor
              key={action}
              policy={policy}
              offices={configuration.governance.offices}
              defaults={configuration.governance.votingDefaults}
              onChange={cachePolicyEditorOnChange(rowKey('15098', action), (updated) => {
                onChange({
                  ...configuration,
                  governance: {
                    ...configuration.governance,
                    policies: replacePolicy(configuration.governance.policies, updated),
                  },
                });
              })}
            />
          );
        })}
    </section>
  );
}
export { PoliciesStep };
