import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyDecision } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyDecisionPayloadSummary } from './decision-payload-summary';
import { TaxBreakdown } from '../taxation/breakdown';

function CompanyVotingPayload({ id }: Readonly<{ id: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['company-decision-payload', id],
    queryFn: async () => {
      const result = await getCompanyDecision({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section>
      <h3>
        {uiText(locale, 'Точные условия корпоративного решения', 'Exact corporate decision terms')}
      </h3>
      {query.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      {query.data !== undefined && (
        <>
          <CompanyDecisionPayloadSummary
            payload={query.data.payload}
            charter={query.data.charter}
          />
          {query.data.calculation !== undefined && (
            <TaxBreakdown calculation={query.data.calculation} code="" />
          )}
          <a href={`/app/company-decisions/${id}`}>
            {uiText(locale, 'Открыть решение и одобрения', 'Open decision and approvals')}
          </a>
        </>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { CompanyVotingPayload };
