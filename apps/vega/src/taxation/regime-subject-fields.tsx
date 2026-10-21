import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { TaxRule } from '@helicraft/alhena';
import { Alert, FormField, Select } from '@helicraft/atria';
import { CompanyPicker } from '../company-picker';
import { CompanyBranchPicker } from '../companies/branch-picker';
import { useCompanySelection } from '../companies/use-company-selection';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';

function initialScope(rule: TaxRule | undefined): string {
  return rule?.regime?.branchId === undefined || rule.regime.branchId === null
    ? 'COMPANY'
    : 'BRANCH';
}
function initialBranch(rule: TaxRule | undefined, companyId: string): string | undefined {
  return rule?.regime?.companyId === companyId ? (rule.regime.branchId ?? undefined) : undefined;
}
function TaxRegimeSubjectFields({
  stateId,
  rule,
}: Readonly<{ stateId: string; rule?: TaxRule }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [scope, setScope] = useState(initialScope(rule));
  const selection = useCompanySelection(rule?.regime?.companyId);
  const changeScope = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setScope(event.currentTarget.value === 'BRANCH' ? 'BRANCH' : 'COMPANY');
  }, []);
  return (
    <>
      <CompanyPicker
        label={uiText(locale, 'Компания — налогоплательщик', 'Company taxpayer')}
        value={selection.company}
        onChange={selection.handleCompanyChange}
      />
      <input type="hidden" name="regimeCompanyId" value={selection.company?.id ?? ''} />
      {selection.loading && (
        <output>{uiText(locale, 'Загрузка компании…', 'Loading company…')}</output>
      )}
      {selection.error && (
        <Alert tone="danger">
          {uiText(
            locale,
            'Компания недоступна. Выберите опубликованную компанию.',
            'Company unavailable. Select a published company.',
          )}
        </Alert>
      )}
      <FormField label={uiText(locale, 'Область действия', 'Scope')} htmlFor={id}>
        <Select id={id} name="regimeScope" value={scope} onChange={changeScope}>
          <option value="COMPANY">
            {uiText(locale, 'Только эта компания', 'This company only')}
          </option>
          <option value="BRANCH">
            {uiText(
              locale,
              'Конкретный филиал в этом государстве',
              'A specific branch in this state',
            )}
          </option>
        </Select>
      </FormField>
      {scope === 'BRANCH' && selection.company !== null && (
        <CompanyBranchPicker
          key={selection.company.id}
          companyId={selection.company.id}
          stateId={stateId}
          name="regimeBranchId"
          required
          initialId={initialBranch(rule, selection.company.id)}
        />
      )}
    </>
  );
}
export { TaxRegimeSubjectFields };
