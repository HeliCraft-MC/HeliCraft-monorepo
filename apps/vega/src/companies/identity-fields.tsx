import { useCallback, useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyConfiguration } from '@helicraft/alhena';
import { FormField, TextField } from '@helicraft/atria';
import { LocalizedInputField } from '../localized-input';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyJurisdictionPicker } from './jurisdiction-picker';
import { RegistrationPolicySummary } from './registration-policy-summary';

function CompanyIdentityFields({
  value,
  onChange,
}: Readonly<{
  value: CompanyConfiguration;
  onChange: (configuration: CompanyConfiguration) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const name = useCallback(
    (next: CompanyConfiguration['name']): void => {
      onChange({ ...value, name: next });
    },
    [value, onChange],
  );
  const description = useCallback(
    (next: CompanyConfiguration['description']): void => {
      onChange({ ...value, description: next });
    },
    [value, onChange],
  );
  const state = useCallback(
    (registrationStateId: string): void => {
      onChange({ ...value, registrationStateId });
    },
    [value, onChange],
  );
  const categories = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({
        ...value,
        categories: event.currentTarget.value
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item !== ''),
      });
    },
    [value, onChange],
  );
  return (
    <>
      <LocalizedInputField
        label={uiText(locale, 'Название компании', 'Company name')}
        value={value.name}
        onChange={name}
      />
      <LocalizedInputField
        label={uiText(locale, 'Описание компании', 'Company description')}
        value={value.description}
        onChange={description}
        multiline
      />
      <FormField
        label={uiText(
          locale,
          'Описательные категории (через запятую)',
          'Descriptive categories (comma separated)',
        )}
        htmlFor={id}
        help={uiText(
          locale,
          'Категории не выдают права и не меняют финансовую логику.',
          'Categories grant no authority and do not change financial behavior.',
        )}
      >
        <TextField id={id} defaultValue={value.categories.join(', ')} onBlur={categories} />
      </FormField>
      <CompanyJurisdictionPicker
        value={value.registrationStateId}
        onChange={state}
        label={uiText(locale, 'Государство регистрации', 'Registration jurisdiction')}
      />
      {value.registrationStateId !== null && (
        <RegistrationPolicySummary stateId={value.registrationStateId} />
      )}
    </>
  );
}
export { CompanyIdentityFields };
