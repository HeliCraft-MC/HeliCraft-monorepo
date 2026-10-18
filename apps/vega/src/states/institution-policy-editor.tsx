// oxlint-disable import/max-dependencies -- The institutional setup composes existing policy controls, summaries and stable callback caches.
import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import type { GovernancePolicy, StateDetail } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText, label } from './text';
import { PolicyEditor } from './policy-editor';
import { policyDescription } from './policy-description';
import { actions, newPolicy } from './policy-model';
import { policyGroup } from './policy-groups';
import { usePropCache } from './use-prop-cache';
import styles from './states.module.scss';

function InstitutionPolicyEditor({
  state,
  group,
  value,
  onChange,
}: Readonly<{
  state: StateDetail;
  group: 'bank' | 'tax' | null;
  value: GovernancePolicy[];
  onChange: (policies: GovernancePolicy[]) => void;
}>): ReactElement | null {
  const { locale } = useTranslation();
  const scope = useMemo(
    () => [state.configuration, value, onChange],
    [state.configuration, value, onChange],
  );
  const edit = usePropCache<NonNullable<ComponentProps<typeof PolicyEditor>['onChange']>>(scope);
  const configure = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  if (group === null) {
    return null;
  }
  return (
    <section className={styles.editor}>
      <h3>
        {uiText(locale, 'Первоначальные процедуры института', 'Initial institution procedures')}
      </h3>
      <p>
        {uiText(
          locale,
          'Настройте, кто будет управлять институтом после его учреждения. Процедуры утверждаются вместе с учреждением. Уже действующие процедуры здесь не меняются — для этого нужна реформа. Ненастроенные действия останутся недоступны.',
          'Choose who will manage the institution. These procedures are approved together with establishment. Existing procedures require a reform to change. Unconfigured actions remain unavailable.',
        )}
      </p>
      {actions
        .filter((action) => policyGroup(action) === group)
        .map((action) => {
          const existing = state.configuration.governance.policies.find(
            (policy) => policy.action === action,
          );
          if (existing !== undefined) {
            return (
              <section className={styles.card} key={action}>
                <h4>{label(action, locale)}</h4>
                <p>{policyDescription(existing, state.configuration, locale)}</p>
                <small>
                  {uiText(
                    locale,
                    'Уже настроено. Изменяется через реформу.',
                    'Already configured. Change through a reform.',
                  )}
                </small>
              </section>
            );
          }
          const policy = value.find((item) => item.action === action);
          return policy === undefined ? (
            <section className={styles.card} key={action}>
              <h4>{label(action, locale)}</h4>
              <Button
                type="button"
                onClick={configure(action, () => {
                  onChange([...value, newPolicy(action)]);
                })}
              >
                {uiText(locale, 'Настроить процедуру', 'Configure procedure')}
              </Button>
            </section>
          ) : (
            <PolicyEditor
              key={action}
              policy={policy}
              offices={state.configuration.governance.offices}
              defaults={state.configuration.governance.votingDefaults}
              onChange={edit(action, (updated) => {
                onChange([...value.filter((item) => item.action !== action), updated]);
              })}
            />
          );
        })}
    </section>
  );
}
export { InstitutionPolicyEditor };
