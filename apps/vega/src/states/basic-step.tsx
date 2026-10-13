import { uiText, displayText } from './text';
import { useMemo, useId } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache } from './use-prop-cache';

import { FormField, TextField } from '@helicraft/atria';

import { useTranslation } from '../i18n';
import { LocalizedInputField } from './localized-input';

import { slugify } from './slug';
import styles from './states.module.scss';
import type { StateWizardStepProps } from './wizard-types';

function BasicInformationStep(props: StateWizardStepProps): ReactElement {
  const {
    step,
    configuration,
    onChange,
    principal,
    cofounders,
    setCofounders,
    stableSlug = false,
  } = props;
  const { locale } = useTranslation();
  const id = useId();

  const callbackScope = useMemo(
    () => [
      step,
      configuration,
      onChange,
      principal,
      cofounders,
      setCofounders,
      stableSlug,
      locale,
      id,
    ],
    [step, configuration, onChange, principal, cofounders, setCofounders, stableSlug, locale, id],
  );
  const cacheLocalizedInputFieldOnChange =
    usePropCache<NonNullable<ComponentProps<typeof LocalizedInputField>['onChange']>>(
      callbackScope,
    );
  const cacheTextFieldOnChange =
    usePropCache<NonNullable<ComponentProps<typeof TextField>['onChange']>>(callbackScope);
  return (
    <section className={styles.editor}>
      <LocalizedInputField
        label={uiText(locale, 'Название государства', 'State name')}
        value={configuration.name}
        onChange={cacheLocalizedInputFieldOnChange('4032', (name) => {
          const source = displayText(name, locale);
          const previousSource = displayText(configuration.name, locale);
          onChange({
            ...configuration,
            name,
            slug:
              !stableSlug &&
              (configuration.slug === '' || configuration.slug === slugify(previousSource))
                ? slugify(source)
                : configuration.slug,
          });
        })}
      />
      <FormField htmlFor={`${id}-slug`} label={uiText(locale, 'Адрес государства', 'State slug')}>
        <TextField
          id={`${id}-slug`}
          disabled={stableSlug}
          value={configuration.slug}
          onChange={cacheTextFieldOnChange('4721', (event) => {
            onChange({ ...configuration, slug: event.currentTarget.value });
          })}
        />
      </FormField>
      <LocalizedInputField
        label={uiText(locale, 'Описание', 'Description')}
        value={configuration.description}
        onChange={cacheLocalizedInputFieldOnChange('5018', (description) => {
          onChange({ ...configuration, description });
        })}
        multiline
      />
      <FormField htmlFor={`${id}-color`} label={uiText(locale, 'Цвет государства', 'State color')}>
        <TextField
          id={`${id}-color`}
          type="color"
          value={configuration.color}
          onChange={cacheTextFieldOnChange('5411', (event) => {
            onChange({ ...configuration, color: event.currentTarget.value });
          })}
        />
      </FormField>
    </section>
  );
}
export { BasicInformationStep };
