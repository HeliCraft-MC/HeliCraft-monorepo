import { useCallback, useId, useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyConfiguration, CompanyBranding } from '@helicraft/alhena';
import {
  Form,
  FormModel,
  FormField,
  TextField,
  useFormModel,
  useFormStore,
} from '@helicraft/atria';
import { z } from 'zod';
import { formLanguages } from '../form-languages';
import { CompanyBrandingEditor } from './branding-editor';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyJurisdictionPicker } from './jurisdiction-picker';
import { RegistrationPolicySummary } from './registration-policy-summary';

function CompanyIdentityFields({
  value,
  onChange,
  companyId,
}: Readonly<{
  companyId: string;
  value: CompanyConfiguration;
  onChange: (configuration: CompanyConfiguration) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const model = useMemo(
    () =>
      new FormModel<CompanyConfiguration>({
        defaultValues: value,
        schema: z.object({
          name: z.record(z.string(), z.string().optional()),
          description: z.record(z.string(), z.string().optional()),
        }),
        fields: [
          {
            kind: 'localized',
            name: 'name',
            label: uiText(locale, 'Название компании', 'Company name'),
          },
          {
            kind: 'localized-multiline',
            name: 'description',
            label: uiText(locale, 'Описание компании', 'Company description'),
          },
        ],
      }),
    [value, locale],
  );
  const form = useFormModel({ model, onSubmit: onChange, onValuesChange: onChange });
  const values = useFormStore(form.store, (state) => state.values);
  const state = useCallback(
    (registrationStateId: string): void => {
      form.setFieldValue('registrationStateId', registrationStateId);
    },
    [form],
  );
  const branding = useCallback(
    (next: CompanyBranding): void => {
      form.setFieldValue('branding', next);
    },
    [form],
  );
  const categories = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      form.setFieldValue(
        'categories',
        event.currentTarget.value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      );
    },
    [form],
  );
  return (
    <Form
      form={form}
      model={model}
      languages={formLanguages}
      defaultLanguage={locale}
      languageLabel={uiText(locale, 'Язык содержимого', 'Content language')}
      translationHint={uiText(
        locale,
        'Название и описание переключаются вместе. Все переводы сохраняются в проекте.',
        'Name and description switch together. All translations are saved in the draft.',
      )}
    >
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
        <TextField id={id} defaultValue={values.categories.join(', ')} onBlur={categories} />
      </FormField>
      <CompanyJurisdictionPicker
        value={values.registrationStateId}
        onChange={state}
        label={uiText(locale, 'Государство регистрации', 'Registration jurisdiction')}
      />
      {values.registrationStateId !== null && (
        <RegistrationPolicySummary stateId={values.registrationStateId} />
      )}
      <CompanyBrandingEditor companyId={companyId} value={values.branding} onChange={branding} />
    </Form>
  );
}
export { CompanyIdentityFields };
