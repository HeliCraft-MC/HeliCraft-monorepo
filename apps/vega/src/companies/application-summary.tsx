import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyRegistrationApplication } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyFormationSummary } from './formation-summary';

function CompanyApplicationSummary({ id }: Readonly<{ id: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['company-application-summary', id],
    queryFn: async () => {
      const result = await getCompanyRegistrationApplication({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section>
      {query.isPending && (
        <p>{uiText(locale, 'Загрузка условий заявки…', 'Loading application terms…')}</p>
      )}
      {query.data !== undefined && (
        <CompanyFormationSummary
          configuration={query.data.configuration}
          companyId={query.data.companyId}
          applicationId={query.data.id}
        />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { CompanyApplicationSummary };
