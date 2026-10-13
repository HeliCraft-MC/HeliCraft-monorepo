import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { getOwnedState, createStateReformDraft } from '@helicraft/alhena';
import { Alert, Button, ActionLink } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { StateDetailView } from '../states/detail';
import { useTranslation } from '../i18n';

const routeApi = getRouteApi('/app/states/$stateId');
function Page(): ReactElement {
  const { stateId } = routeApi.useParams();
  const { locale } = useTranslation();
  const navigate = useNavigate();
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
  const reform = useMutation({
    mutationFn: async () => {
      const result = await createStateReformDraft({
        client: browserClient(),
        path: { id: stateId },
        throwOnError: true,
      });
      await navigate({
        to: '/app/states/drafts/$draftId',
        params: { draftId: result.data.draftId },
      });
    },
  });
  const { mutate: startReform } = reform;
  const handleReform = useCallback(() => {
    startReform();
  }, [startReform]);
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
          {state.data.status === 'ACTIVE' && (
            <Button onClick={handleReform}>
              {locale === 'ru' ? 'Создать черновик реформы' : 'Create reform draft'}
            </Button>
          )}
        </StateDetailView>
      )}
      {state.isPending && <p>{locale === 'ru' ? 'Загрузка…' : 'Loading…'}</p>}
      {(state.error ?? reform.error) !== null && (
        <Alert tone="danger">{errorMessage(state.error ?? reform.error)}</Alert>
      )}
    </>
  );
}
const Route = createFileRoute('/app/states/$stateId')({ component: Page });
export { Route };
