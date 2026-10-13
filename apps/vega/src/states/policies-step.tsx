import { STEPS } from './wizard-steps';
import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';

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
  return (
    <section className={styles.editor}>
      {actions
        .filter((action) =>
          step === STEPS.CITIZENSHIP_AUTHORITY
            ? action === 'ACCEPT_CITIZEN' || action === 'REMOVE_CITIZEN'
            : action !== 'ACCEPT_CITIZEN' && action !== 'REMOVE_CITIZEN',
        )
        .map((action) => {
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
