import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { getOwnedState } from '@helicraft/alhena';
import { Alert, ActionLink } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { StateDetailView } from '../states/detail';
import { useTranslation } from '../i18n';

const routeApi = getRouteApi('/app/states/$stateId');
function Page(): ReactElement {
  const { stateId } = routeApi.useParams();
  const { locale } = useTranslation();
  const state = useQuery({
    queryKey: ['owned-state', stateId, locale],
    queryFn: async () => {
      const result = await getOwnedState({
        client: browserClient(),
        path: { id: stateId },
        query: { locale },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <>
      {state.data && (
        <StateDetailView state={state.data}>
          <ActionLink href={`/app/states/${stateId}/proposals`}>
            {locale === 'ru' ? 'Предложения об устройстве государства' : 'Governance proposals'}
          </ActionLink>
          {state.data.status === 'ACTIVE' && (
            <ActionLink href={`/states/${state.data.slug}`}>
              {locale === 'ru' ? 'Открыть публичную страницу' : 'Open public page'}
            </ActionLink>
          )}
        </StateDetailView>
      )}
      {state.isPending && <p>{locale === 'ru' ? 'Загрузка…' : 'Loading…'}</p>}
      {state.error !== null && <Alert tone="danger">{errorMessage(state.error)}</Alert>}
    </>
  );
}
const Route = createFileRoute('/app/states/$stateId')({ component: Page });
export { Route };
