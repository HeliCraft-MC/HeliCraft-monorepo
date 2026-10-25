// oxlint-disable import/max-dependencies -- The directory composes shared company and state identities with protected pagination.
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCompanyWorkspaces } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { CompanyName } from '../company-name';
import { RegistrationStateName } from './registration-state-name';
import { companyStatusLabel } from './labels';

function CompanyWorkspaceDirectory({ actorId }: Readonly<{ actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['company-workspaces', actorId, page],
    queryFn: async () => {
      const result = await listCompanyWorkspaces({
        client: browserClient(),
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section>
      <h2>{uiText(locale, 'Доступные компании', 'Available company workspaces')}</h2>
      <p>
        {uiText(
          locale,
          'Список учитывает ваши действующие должности и участие собственников через Governance.',
          'This list follows your current offices and ownership participation through Governance.',
        )}
      </p>
      {query.isPending && <p>{uiText(locale, 'Загрузка компаний…', 'Loading companies…')}</p>}
      {query.data?.items.length === 0 && (
        <p>{uiText(locale, 'Пока нет компаний с доступом.', 'No company workspace access yet.')}</p>
      )}
      <ul>
        {query.data?.items.map((company) => (
          <li key={company.id}>
            <CompanyName
              id={company.id}
              href={`/app/companies/${company.id}`}
              name={displayText(company.name, locale)}
              branding={company.branding}
            />{' '}
            · {companyStatusLabel(company.status, locale)} ·{' '}
            <RegistrationStateName company={company} />
          </li>
        ))}
      </ul>
      {query.data !== undefined && (
        <MonetaryPagination page={query.data.page} hasMore={query.data.hasMore} onPage={setPage} />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { CompanyWorkspaceDirectory };
