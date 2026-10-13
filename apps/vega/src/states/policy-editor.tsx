import { uiText, displayText, label } from './text';
import { useMemo, useId } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';
import type { GovernancePolicy, StateOffice, GovernanceVotingRules } from '@helicraft/alhena';
import { Checkbox, FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { LocalizedInputField } from './localized-input';
import { VotingRulesEditor } from './voting-rules';
import styles from './states.module.scss';

import { selectedOffices, mechanisms } from './policy-model';

function PolicyEditor({
  policy,
  offices,
  defaults,
  onChange,
}: Readonly<{
  policy: GovernancePolicy;
  offices: readonly StateOffice[];
  defaults: GovernanceVotingRules;
  onChange: (policy: GovernancePolicy) => void;
}>): ReactElement {
  const id = useId();
  const { locale } = useTranslation();
  const voting = ['CITIZEN_VOTE', 'COUNCIL_VOTE', 'COMBINED'].includes(policy.mechanism);
  const callbackScope1 = useMemo(
    () => [policy, offices, defaults, onChange, id, locale, voting],
    [policy, offices, defaults, onChange, id, locale, voting],
  );
  const cacheSelectOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Select>['onChange']>>(callbackScope1);
  const cacheCheckboxOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Checkbox>['onChange']>>(callbackScope1);
  const cacheLocalizedInputFieldOnChange =
    usePropCache<NonNullable<ComponentProps<typeof LocalizedInputField>['onChange']>>(
      callbackScope1,
    );
  const cacheVotingRulesEditorOnChange =
    usePropCache<NonNullable<ComponentProps<typeof VotingRulesEditor>['onChange']>>(callbackScope1);
  return (
    <section className={styles.card}>
      <h3>{label(policy.action, locale)}</h3>
      <FormField
        htmlFor={id}
        label={uiText(locale, 'Кто принимает решение?', 'Who makes this decision?')}
      >
        <Select
          id={id}
          value={policy.mechanism}
          onChange={cacheSelectOnChange('1696', (event) => {
            const mechanism = mechanisms.find((item) => item === event.currentTarget.value);
            if (mechanism) {
              onChange({ ...policy, mechanism });
            }
          })}
        >
          {mechanisms.map((item) => (
            <option key={item} value={item}>
              {label(item, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      {!['CITIZEN_VOTE', 'MANUAL'].includes(policy.mechanism) && (
        <fieldset>
          <legend>{uiText(locale, 'Должности', 'Offices')}</legend>
          {offices.map((office) => (
            <Checkbox
              key={office.id}
              label={displayText(office.name, locale) || uiText(locale, 'Без названия', 'Unnamed')}
              checked={policy.officeIds.includes(office.id)}
              onChange={cacheCheckboxOnChange(rowKey('2550', office), (event) => {
                onChange({
                  ...policy,
                  officeIds: selectedOffices(policy, office.id, event.currentTarget.checked),
                });
              })}
            />
          ))}
        </fieldset>
      )}
      {policy.mechanism === 'MANUAL' && (
        <LocalizedInputField
          label={uiText(locale, 'Описание ручной процедуры', 'Manual procedure description')}
          value={policy.manualProcedure}
          onChange={cacheLocalizedInputFieldOnChange('3231', (manualProcedure) => {
            onChange({ ...policy, manualProcedure });
          })}
          multiline
        />
      )}
      {voting && (
        <>
          <Checkbox
            label={uiText(locale, 'Собственные правила голосования', 'Override voting defaults')}
            checked={policy.vote !== null}
            onChange={cacheCheckboxOnChange('3577', (event) => {
              onChange({ ...policy, vote: event.currentTarget.checked ? { ...defaults } : null });
            })}
          />
          {policy.vote !== null && (
            <VotingRulesEditor
              value={policy.vote}
              onChange={cacheVotingRulesEditorOnChange('3843', (vote) => {
                onChange({ ...policy, vote });
              })}
            />
          )}
        </>
      )}
    </section>
  );
}
export { PolicyEditor };
