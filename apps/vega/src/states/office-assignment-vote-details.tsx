import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOfficeAssignment } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { OfficeAssignmentPayload } from './office-assignment-payload';
import { useTranslation } from '../i18n';
import { uiText } from './text';

function OfficeAssignmentVoteDetails({ id }: Readonly<{ id: string }>): ReactElement {
  const { locale } = useTranslation();
  const proposal = useQuery({
    queryKey: ['office-assignment', id],
    queryFn: async () => {
      const result = await getOfficeAssignment({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <details>
      <summary>
        {uiText(locale, 'Полное предложение о должности', 'Complete office proposal')}
      </summary>
      {proposal.data && <OfficeAssignmentPayload proposal={proposal.data} />}
      {proposal.isPending && (
        <output>{uiText(locale, 'Загрузка предложения…', 'Loading proposal…')}</output>
      )}
      {proposal.error !== null && <Alert tone="danger">{errorMessage(proposal.error)}</Alert>}
    </details>
  );
}
export { OfficeAssignmentVoteDetails };
