// oxlint-disable import/max-dependencies -- The administration directory composes shared company and state identities with public catalogue filtering.
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, listCompanyCatalogue } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField } from '@helicraft/atria';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyName } from '../company-name';
import { RegistrationStateName } from './registration-state-name';
import { companyStatusLabel } from './labels';
import { MonetaryPagination } from '../monetary/pagination';

function AdminCompanyDirectory({ search }: Readonly<{ search: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin-company-directory', search, page, locale],
    queryFn: async () => {
      const result = await listCompanyCatalogue({
        client: createClient({ credentials: 'omit' }),
        query: { search, status: 'ALL', page, locale },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section>
      <h2>{uiText(locale, 'Зарегистрированные компании', 'Registered companies')}</h2>
      <form method="get" action="/admin/companies">
        <FormField
          htmlFor="admin-company-search"
          label={uiText(locale, 'Название компании', 'Company name')}
        >
          <TextField
            id="admin-company-search"
            type="search"
            name="search"
            defaultValue={search}
            maxLength={100}
          />
        </FormField>
        <Button type="submit">{uiText(locale, 'Найти', 'Search')}</Button>
      </form>
      {query.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Компании не найдены.', 'No companies found.')}</p>
      )}
      <ul>
        {query.data?.items.map((company) => (
          <li key={company.id}>
            <CompanyName
              id={company.id}
              href={`/admin/companies?companyId=${company.id}`}
              name={displayText(company.name, locale)}
              branding={company.branding}
            />{' '}
            · {companyStatusLabel(company.status, locale)} ·{' '}
            <RegistrationStateName company={company} />
          </li>
        ))}
      </ul>
      {query.data !== undefined && (
        <MonetaryPagination
          page={page}
          onPage={setPage}
          hasMore={page * query.data.pageSize < query.data.total}
        />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { AdminCompanyDirectory };
