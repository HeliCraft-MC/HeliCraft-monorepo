import { uiText, label } from './text';
import { useMemo, useId } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache } from './use-prop-cache';

import { Checkbox, FormField, Select } from '@helicraft/atria';

import { useTranslation } from '../i18n';

import styles from './states.module.scss';
import type { StateWizardStepProps } from './wizard-types';

function CitizenshipStep(props: StateWizardStepProps): ReactElement {
  const { step, configuration, onChange, principal, cofounders, setCofounders } = props;
  const { locale } = useTranslation();
  const id = useId();

  const callbackScope = useMemo(
    () => [step, configuration, onChange, principal, cofounders, setCofounders, locale, id],
    [step, configuration, onChange, principal, cofounders, setCofounders, locale, id],
  );
  const cacheSelectOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Select>['onChange']>>(callbackScope);
  const cacheCheckboxOnChange =
    usePropCache<NonNullable<ComponentProps<typeof Checkbox>['onChange']>>(callbackScope);
  return (
    <section className={styles.editor}>
      <FormField
        htmlFor={`${id}-entry`}
        label={uiText(locale, 'Как получают гражданство?', 'How do players obtain citizenship?')}
        help={uiText(
          locale,
          'По заявке — кандидат обращается в государство; по приглашению — инициатива исходит от государства; закрытый режим не предполагает свободного вступления. Решение регулируется полномочиями по гражданству.',
          'Application means the candidate asks to join; invitation means the state initiates admission; closed entry prevents open joining. Citizenship decision rules determine approval.',
        )}
      >
        <Select
          id={`${id}-entry`}
          value={configuration.citizenship.entryMode}
          onChange={cacheSelectOnChange('9924', (event) => {
            const entryMode = event.currentTarget.value;
            if (
              entryMode === 'OPEN' ||
              entryMode === 'BY_APPLICATION' ||
              entryMode === 'BY_INVITATION'
            ) {
              onChange({
                ...configuration,
                citizenship: { ...configuration.citizenship, entryMode },
              });
            }
          })}
        >
          {(['BY_APPLICATION', 'BY_INVITATION', 'OPEN'] as const).map((mode) => (
            <option key={mode} value={mode}>
              {label(mode, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      <Checkbox
        label={uiText(
          locale,
          'Разрешено гражданство нескольких государств',
          'Allow citizenship of multiple states',
        )}
        checked={configuration.citizenship.allowMultipleCitizenships}
        onChange={cacheCheckboxOnChange('10888', (event) => {
          onChange({
            ...configuration,
            citizenship: {
              ...configuration.citizenship,
              allowMultipleCitizenships: event.currentTarget.checked,
            },
          });
        })}
      />
    </section>
  );
}
export { CitizenshipStep };
