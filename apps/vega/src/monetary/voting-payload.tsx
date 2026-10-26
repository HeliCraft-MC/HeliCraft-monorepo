import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMonetaryVotingPayload } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { TreatyDecisionContent } from '../diplomacy/decision-content';
import { TerritoryDecisionContent } from '../spatial/decision-content';
import { PayloadSummary } from './payload-summary';

function MonetaryVotingPayload({ id }: Readonly<{ id: string }>): ReactElement {
  const { text } = useTranslation();
  const query = useQuery({
    queryKey: ['monetary-voting-payload', id],
    queryFn: async () => {
      const result = await getMonetaryVotingPayload({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <details open>
      <summary>{text('monetary.directives')}</summary>
      {query.isPending && <output>{text('monetary.loading')}</output>}
      {query.data && (
        <>
          <PayloadSummary
            payload={query.data.payload}
            code={query.data.code}
            fxDisplay={query.data.fxDisplay}
          />
          {query.data.territorialDisplay && (
            <TerritoryDecisionContent display={query.data.territorialDisplay} />
          )}
          {query.data.treatyContent !== null && (
            <TreatyDecisionContent content={query.data.treatyContent} />
          )}
          <p>{query.data.payloadHash}</p>
        </>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </details>
  );
}
export { MonetaryVotingPayload };
