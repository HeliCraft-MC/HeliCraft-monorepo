import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { Button, FormField, TextField } from '@helicraft/atria';
import { LocalizedInputField } from '../localized-input';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyDecisionReview } from './decision-review';
import { useCompanyDecisionSubmission } from './use-decision-submission';

function CompanySettingsWorkspace({
  workspace,
  onSaved,
}: Readonly<{ workspace: CompanyWorkspace; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [name, setName] = useState(workspace.content.name);
  const [description, setDescription] = useState(workspace.content.description);
  const [categories, setCategories] = useState(workspace.content.categories.join(', '));
  const submission = useCompanyDecisionSubmission(workspace, onSaved);
  const { propose } = submission;
  const changeCategories = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setCategories(event.currentTarget.value);
  }, []);
  const review = useCallback((): void => {
    propose({
      kind: 'UPDATE_PROFILE',
      name,
      description,
      categories: categories
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== ''),
    });
  }, [name, description, categories, propose]);
  return (
    <section>
      <h2>{uiText(locale, 'Официальные сведения', 'Official company details')}</h2>
      {workspace.availableActions.includes('UPDATE_PROFILE') && (
        <>
          <LocalizedInputField
            label={uiText(locale, 'Название компании', 'Company name')}
            value={name}
            onChange={setName}
          />
          <LocalizedInputField
            label={uiText(locale, 'Описание компании', 'Company description')}
            value={description}
            onChange={setDescription}
            multiline
          />
          <FormField
            label={uiText(locale, 'Описательные категории', 'Descriptive categories')}
            htmlFor={`${id}-categories`}
          >
            <TextField id={`${id}-categories`} value={categories} onChange={changeCategories} />
          </FormField>
          <Button onClick={review}>
            {uiText(locale, 'Проверить изменение сведений', 'Review profile update')}
          </Button>
        </>
      )}
      <p>
        {uiText(
          locale,
          'Закрытие учреждённой компании в V1 недоступно: сначала необходимы будущие процедуры погашения капитала и ликвидации. Неподанные проекты можно отозвать без удаления истории.',
          'Registered companies cannot close in V1: capital retirement and liquidation require future procedures. Unsubmitted drafts can be withdrawn without deleting history.',
        )}
      </p>

      <CompanyDecisionReview workspace={workspace} submission={submission} />
    </section>
  );
}
export { CompanySettingsWorkspace };
