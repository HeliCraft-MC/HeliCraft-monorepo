import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyBranchApplication } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function CompanyBranchReviewSummary({
  branchId,
  applicationId,
}: Readonly<{ branchId: string; applicationId: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['branch-application-summary', branchId, applicationId],
    queryFn: async () => {
      const result = await getCompanyBranchApplication({
        client: browserClient(),
        path: { id: branchId, applicationId },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section>
      {query.isPending && (
        <p>{uiText(locale, 'Загрузка условий филиала…', 'Loading branch terms…')}</p>
      )}
      {query.data !== undefined && (
        <>
          <h4>{displayText(query.data.name, locale)}</h4>
          <p>{displayText(query.data.description, locale)}</p>
        </>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { CompanyBranchReviewSummary };
