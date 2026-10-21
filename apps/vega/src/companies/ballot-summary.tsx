import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVoting } from '@helicraft/alhena';
import type { CompanyDecisionPayload } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function CompanyBallotSummary({
  payload,
}: Readonly<{
  payload: Extract<CompanyDecisionPayload, { kind: 'VOTE_AS_SHAREHOLDER' }>;
}>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['company-entity-ballot', payload.votingId],
    queryFn: async () => {
      const result = await getVoting({
        client: browserClient(),
        path: { id: payload.votingId },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section>
      <h3>{uiText(locale, 'Голос юридического лица', 'Legal entity ballot')}</h3>
      {query.data !== undefined && (
        <>
          <p>{displayText(query.data.input.title, locale)}</p>
          <ul>
            {query.data.input.options
              .filter((option) => payload.choices.includes(option.id))
              .map((option) => (
                <li key={option.id}>{displayText(option.label, locale)}</li>
              ))}
          </ul>
        </>
      )}
      {payload.abstain && <p>{uiText(locale, 'Воздержаться', 'Abstain')}</p>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { CompanyBallotSummary };
