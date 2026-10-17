import type { ReactElement } from 'react';
import type { StateMonetary } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { useTranslation } from '../i18n';

function DirectiveResult({
  id,
  monetary,
}: Readonly<{ id: string | null; monetary: StateMonetary }>): ReactElement | null {
  const { text } = useTranslation();
  if (id === null) {
    return null;
  }
  const directive = monetary.directives.find((item) => item.id === id);
  const transaction = monetary.transactions.find((item) => item.directiveId === id);
  return (
    <Alert tone="success">
      <p>{directive?.status === 'APPLIED' ? text('monetary.applied') : text('monetary.saved')}</p>
      <p>
        {text('monetary.directiveId')}: {id}
      </p>
      {transaction !== undefined && (
        <p>
          {text('monetary.id')}: {transaction.id}
        </p>
      )}
    </Alert>
  );
}
export { DirectiveResult };
