import { useCallback, useId, useMemo, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyWorkspace, CompanyOffice } from '@helicraft/alhena';
import { Button, FieldHelp, FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { OfficeIdentityFields } from './office-identity-fields';
import { CompanyProcedureEditor } from './procedure-editor';
import { newCompanyOffice } from './charter-model';
import { useCompanyDecisionSubmission } from './use-decision-submission';
import { CompanyDecisionReview } from './decision-review';

function CompanyOfficeDefinition({
  workspace,
  onSaved,
}: Readonly<{ workspace: CompanyWorkspace; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [office, setOffice] = useState<CompanyOffice>(() => newCompanyOffice());
  const submission = useCompanyDecisionSubmission(workspace, onSaved);
  const { propose } = submission;
  const existing = workspace.content.charter.offices.some((item) => item.id === office.id);
  const offices = useMemo(
    () =>
      existing
        ? workspace.content.charter.offices.map((item) => (item.id === office.id ? office : item))
        : [...workspace.content.charter.offices, office],
    [workspace.content.charter.offices, office, existing],
  );
  const select = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const found = workspace.content.charter.offices.find(
        (item) => item.id === event.currentTarget.value,
      );
      setOffice(found ?? newCompanyOffice());
    },
    [workspace.content.charter.offices],
  );
  const appointment = useCallback((value: CompanyOffice['appointment']): void => {
    setOffice((current) => ({ ...current, appointment: value }));
  }, []);
  const removal = useCallback((value: CompanyOffice['removal']): void => {
    setOffice((current) => ({ ...current, removal: value }));
  }, []);
  const review = useCallback((): void => {
    propose({ kind: existing ? 'UPDATE_OFFICE' : 'CREATE_OFFICE', office });
  }, [existing, office, propose]);
  return (
    <section>
      <h3>{uiText(locale, 'Создать или изменить должность', 'Create or update an office')}</h3>
      <FormField label={uiText(locale, 'Редактируемая должность', 'Office to edit')} htmlFor={id}>
        <Select id={id} value={existing ? office.id : ''} onChange={select}>
          <option value="">{uiText(locale, 'Новая должность', 'New office')}</option>
          {workspace.content.charter.offices.map((item) => (
            <option key={item.id} value={item.id}>
              {displayText(item.name, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      <OfficeIdentityFields value={office} onChange={setOffice} />
      <h4>{uiText(locale, 'Назначение', 'Appointment')}</h4>
      <CompanyProcedureEditor
        value={office.appointment}
        offices={offices}
        defaults={workspace.content.charter.votingDefaults}
        onChange={appointment}
      />
      <h4>{uiText(locale, 'Освобождение', 'Removal')}</h4>
      <CompanyProcedureEditor
        value={office.removal}
        offices={offices}
        defaults={workspace.content.charter.votingDefaults}
        onChange={removal}
      />
      <FieldHelp
        label={uiText(locale, 'Обязательные должности', 'Required offices')}
        content={uiText(
          locale,
          'Новую должность сначала создайте необязательной. После действительного назначения её можно сделать обязательной. Определение должности само по себе никого не назначает.',
          'Create a new office as optional first. After a valid appointment it can be made required. An office definition never appoints anyone.',
        )}
      />
      <Button
        onClick={review}
        disabled={
          !workspace.availableActions.includes(existing ? 'UPDATE_OFFICE' : 'CREATE_OFFICE')
        }
      >
        {uiText(locale, 'Проверить определение должности', 'Review office definition')}
      </Button>
      <CompanyDecisionReview workspace={workspace} submission={submission} />
    </section>
  );
}
export { CompanyOfficeDefinition };
