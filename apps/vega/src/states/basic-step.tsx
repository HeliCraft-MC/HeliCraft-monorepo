import { useCallback, useId, useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { LocalizedInput } from '@helicraft/alhena';
import { FormField, TextField } from '@helicraft/atria';
import { LocalizedForm } from '../localized-form';
import { useTranslation } from '../i18n';
import { uiText, displayText } from './text';
import { slugify } from './slug';
import type { StateWizardStepProps } from './wizard-types';
import styles from './states.module.scss';

function BasicInformationStep({
  configuration,
  onChange,
  stableSlug = false,
}: StateWizardStepProps): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const name = useCallback(
    (value: LocalizedInput): void => {
      const automatic =
        !stableSlug &&
        (configuration.slug === '' ||
          configuration.slug === slugify(displayText(configuration.name, locale)));
      onChange({
        ...configuration,
        name: value,
        slug: automatic ? slugify(displayText(value, locale)) : configuration.slug,
      });
    },
    [configuration, onChange, stableSlug, locale],
  );
  const description = useCallback(
    (value: LocalizedInput): void => {
      onChange({ ...configuration, description: value });
    },
    [configuration, onChange],
  );
  const fields = useMemo(
    () => [
      {
        name: 'name',
        label: uiText(locale, 'Название государства', 'State name'),
        value: configuration.name,
        onChange: name,
      },
      {
        name: 'description',
        label: uiText(locale, 'Описание', 'Description'),
        value: configuration.description,
        onChange: description,
        multiline: true,
      },
    ],
    [configuration.name, configuration.description, name, description, locale],
  );
  const slug = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...configuration, slug: event.currentTarget.value });
    },
    [configuration, onChange],
  );
  const color = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...configuration, color: event.currentTarget.value });
    },
    [configuration, onChange],
  );
  return (
    <section className={styles.editor}>
      <LocalizedForm fields={fields} />
      <FormField
        htmlFor={`${id}-slug`}
        label={uiText(locale, 'Адрес государства', 'State slug')}
        hint={uiText(
          locale,
          'Подставляется из названия; после учреждения адрес сохраняется.',
          'Suggested from the name; the address stays fixed after formation.',
        )}
      >
        <TextField
          id={`${id}-slug`}
          disabled={stableSlug}
          value={configuration.slug}
          onChange={slug}
        />
      </FormField>
      <FormField htmlFor={`${id}-color`} label={uiText(locale, 'Цвет государства', 'State color')}>
        <TextField id={`${id}-color`} type="color" value={configuration.color} onChange={color} />
      </FormField>
    </section>
  );
}
export { BasicInformationStep };
