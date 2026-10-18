import { useCallback } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { FormField, Select } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { uiText } from './states/text';
import { BankAdministration } from './monetary/admin';
import { AdminMonetaryDirectives } from './monetary/admin-directives';
import { TaxOfficeAdministration } from './taxation/admin';

const route = getRouteApi('/admin/institutions');
function AdminInstitutions(): ReactElement {
  const { locale } = useTranslation();
  const { institution } = route.useSearch();
  const navigate = useNavigate();
  const choose = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const { value } = event.currentTarget;
      if (value === 'bank' || value === 'tax') {
        void navigate({ to: '/admin/institutions', search: { institution: value } });
      }
    },
    [navigate],
  );
  return (
    <>
      <h1>{uiText(locale, 'Институты', 'Institutions')}</h1>
      <FormField
        htmlFor="admin-institution"
        label={uiText(locale, 'Выберите институт', 'Choose an institution')}
      >
        <Select id="admin-institution" value={institution} onChange={choose}>
          <option value="bank">{uiText(locale, 'Центральные банки', 'Central banks')}</option>
          <option value="tax">{uiText(locale, 'Налоговые службы', 'Tax offices')}</option>
        </Select>
      </FormField>
      {institution === 'tax' ? (
        <TaxOfficeAdministration />
      ) : (
        <>
          <BankAdministration />
          <AdminMonetaryDirectives />
        </>
      )}
    </>
  );
}
export { AdminInstitutions };
