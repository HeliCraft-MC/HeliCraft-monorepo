import { STEPS } from './wizard-steps';
import { useMemo } from 'react';
import type { ComponentProps, ReactElement, MouseEventHandler } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';

import { Button } from '@helicraft/atria';
import { label, uiText } from './text';
import { useTranslation } from '../i18n';

import { PolicyEditor } from './policy-editor';
import { actions, newPolicy } from './policy-model';

import styles from './states.module.scss';
import type { StateWizardStepProps } from './wizard-types';

function PoliciesStep(props: StateWizardStepProps): ReactElement {
  const { step, configuration, onChange, principal, cofounders, setCofounders } = props;
  const { locale } = useTranslation();

  const callbackScope = useMemo(
    () => [step, configuration, onChange, principal, cofounders, setCofounders, locale],
    [step, configuration, onChange, principal, cofounders, setCofounders, locale],
  );
  const cachePolicyEditorOnChange =
    usePropCache<NonNullable<ComponentProps<typeof PolicyEditor>['onChange']>>(callbackScope);
  const cacheConfigure = usePropCache<MouseEventHandler<HTMLButtonElement>>(callbackScope);
  return (
    <section className={styles.editor}>
      {actions
        .filter((action) =>
          step === STEPS.CITIZENSHIP_AUTHORITY
            ? action === 'ACCEPT_CITIZEN' || action === 'REMOVE_CITIZEN'
            : action !== 'ACCEPT_CITIZEN' && action !== 'REMOVE_CITIZEN',
        )
        .map((action) => {
          const existing = configuration.governance.policies.find((item) => item.action === action);
          if (
            existing === undefined &&
            [
              'ESTABLISH_CENTRAL_BANK',
              'CHANGE_BANK_CHARTER',
              'CREATE_CURRENCY',
              'CHANGE_MONETARY_POLICY',
              'ISSUE_CURRENCY',
              'BURN_CURRENCY',
              'TRANSFER_CENTRAL_BANK',
              'SPEND_TREASURY',
              'ESTABLISH_TAX_OFFICE',
              'CHANGE_TAX_OFFICE_CHARTER',
              'AMEND_TAX_LAW',
              'SIGN_TREATY',
              'AMEND_TREATY',
              'DENOUNCE_TREATY',
            ].includes(action)
          ) {
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
                        policies: [...configuration.governance.policies, newPolicy(action)],
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
                    policies: [
                      ...configuration.governance.policies.filter((item) => item.action !== action),
                      updated,
                    ],
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
