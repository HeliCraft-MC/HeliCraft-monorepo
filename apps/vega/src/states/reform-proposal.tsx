import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStateReformProposal } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { StateReview } from './review';
import { uiText } from './text';

function ReformProposal({ votingId }: Readonly<{ votingId: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['reform-proposal', votingId, locale],
    queryFn: async () => {
      const result = await getStateReformProposal({
        client: browserClient(),
        path: { id: votingId },
        query: { locale },
        throwOnError: true,
      });
      return result.data;
    },
  });
  if (query.isPending) {
    return <p>{uiText(locale, 'Загрузка проекта реформы…', 'Loading reform proposal…')}</p>;
  }
  if (query.isError) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  return (
    <details>
      <summary>
        {uiText(
          locale,
          'Проект реформы, вынесенный на голосование',
          'Reform proposal submitted for voting',
        )}
      </summary>
      <StateReview
        configuration={query.data.configuration}
        founders={query.data.founders}
        html={query.data.html}
        flagUrl={`/api/v1/account/state-reform-votes/${votingId}/flag`}
      />
    </details>
  );
}
export { ReformProposal };
