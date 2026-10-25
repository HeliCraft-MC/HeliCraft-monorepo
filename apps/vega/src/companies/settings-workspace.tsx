import { useCallback, useId, useMemo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyBranding, CompanyWorkspace } from '@helicraft/alhena';
import {
  Alert,
  Button,
  Form,
  FormField,
  TextField,
  useFormModel,
  useFormStore,
} from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { formLanguages } from '../form-languages';
import { uiText } from '../states/text';
import { CompanyDecisionReview } from './decision-review';
import { useCompanyDecisionSubmission } from './use-decision-submission';
import { companyProfileForm } from './profile-form-model';
import { CompanyBrandingEditor } from './branding-editor';

function CompanySettingsWorkspace({
  workspace,
  onSaved,
}: Readonly<{ workspace: CompanyWorkspace; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const submission = useCompanyDecisionSubmission(workspace, onSaved);
  const model = useMemo(
    () =>
      companyProfileForm(
        {
          kind: 'UPDATE_PROFILE',
          name: workspace.content.name,
          description: workspace.content.description,
          categories: workspace.content.categories,
          branding: workspace.content.branding,
        },
        locale,
      ),
    [workspace.content, locale],
  );
  const form = useFormModel({ model, onSubmit: submission.propose });
  const values = useFormStore(form.store, (state) => state.values);
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
  const branding = useCallback(
    (next: CompanyBranding): void => {
      form.setFieldValue('branding', next);
    },
    [form],
  );
  if (!workspace.availableActions.includes('UPDATE_PROFILE')) {
    return (
      <Alert>
        {uiText(
          locale,
          'Изменение сведений требует полномочия по уставу компании.',
          'Updating the profile requires authority under the company charter.',
        )}
      </Alert>
    );
  }
  return (
    <section>
      <h2>{uiText(locale, 'Сведения и оформление', 'Profile and appearance')}</h2>
      <Form
        form={form}
        model={model}
        languages={formLanguages}
        defaultLanguage={locale}
        languageLabel={uiText(locale, 'Язык содержимого', 'Content language')}
        translationHint={uiText(
          locale,
          'Название и описание переключаются вместе. Изменения проходят процедуру одобрения по уставу.',
          'Name and description switch together. Changes follow the charter approval procedure.',
        )}
      >
        <FormField
          label={uiText(locale, 'Категории через запятую', 'Categories, separated by commas')}
          htmlFor={id}
        >
          <TextField id={id} defaultValue={values.categories.join(', ')} onBlur={categories} />
        </FormField>
        <CompanyBrandingEditor
          companyId={workspace.id}
          value={values.branding}
          onChange={branding}
        />
        <Button type="submit">
          {uiText(locale, 'Проверить изменение сведений', 'Review profile update')}
        </Button>
      </Form>
      <CompanyDecisionReview workspace={workspace} submission={submission} />
    </section>
  );
}
export { CompanySettingsWorkspace };
