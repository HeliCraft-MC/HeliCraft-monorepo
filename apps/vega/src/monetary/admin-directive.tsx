import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdminState, getStateMonetary } from '@helicraft/alhena';
import type { MonetaryDirective } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { DirectiveCard } from './directive-card';

function AdminMonetaryDirective({
  directive,
  actorId,
  onSaved,
}: Readonly<{ directive: MonetaryDirective; actorId: string; onSaved: () => void }>): ReactElement {
  const state = useQuery({
    queryKey: ['admin-monetary-state', directive.stateId],
    queryFn: async () => {
      const result = await getAdminState({
        client: browserClient(),
        path: { id: directive.stateId },
        throwOnError: true,
      });
      const money = await getStateMonetary({
        client: browserClient(),
        path: { stateId: directive.stateId },
        throwOnError: true,
      });
      return { state: result.data, code: money.data.currency?.code ?? '' };
    },
  });
  return (
    <>
      {state.data !== undefined && (
        <DirectiveCard
          directive={directive}
          state={state.data.state}
          actorId={actorId}
          code={state.data.code}
          onSaved={onSaved}
        />
      )}
      {state.error !== null && <Alert tone="danger">{errorMessage(state.error)}</Alert>}
    </>
  );
}
export { AdminMonetaryDirective };
