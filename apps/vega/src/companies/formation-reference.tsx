import type { ReactElement } from 'react';
import { Alert } from '@helicraft/atria';
import { useQuery } from '@tanstack/react-query';
import { getCompanyFormationProject } from '@helicraft/alhena';
import { browserClient } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyFormationSummary } from './formation-summary';

function CompanyFormationReference({
  companyId,
  formationHash,
}: Readonly<{ companyId: string; formationHash?: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['company-formation-project', companyId],
    queryFn: async () => {
      const result = await getCompanyFormationProject({
        client: browserClient(),
        path: { id: companyId },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return query.data === undefined ? (
    <p>{uiText(locale, 'Проект учреждения недоступен', 'Formation project unavailable')}</p>
  ) : (
    <section>
      {formationHash !== undefined && formationHash !== query.data.formationHash && (
        <Alert tone="info">
          {uiText(
            locale,
            'Проект изменился после этого решения. Старое согласие не действует для новых условий.',
            'The project changed after this decision. The previous consent does not cover the new terms.',
          )}
        </Alert>
      )}
      {formationHash === query.data.formationHash && (
        <CompanyFormationSummary configuration={query.data.configuration} />
      )}
      <a href={`/app/companies/drafts/${query.data.id}`}>
        {displayText(query.data.configuration.name, locale) || query.data.title}
      </a>
    </section>
  );
}
export { CompanyFormationReference };
