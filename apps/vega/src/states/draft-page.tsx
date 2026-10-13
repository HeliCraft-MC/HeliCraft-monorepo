import { uiText } from './text';
import { DraftEditor } from './draft-editor';

import type { ReactElement } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getStateDraft, lookupPlayers, getOwnedState } from '@helicraft/alhena';
import type { Principal } from '@helicraft/alhena';
import { Alert, ActionLink } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';

import { useTranslation } from '../i18n';

function StateDraftPage({
  id,
  principal,
}: Readonly<{ id: string; principal: Principal }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['state-draft', id],
    queryFn: async () => {
      const { data } = await getStateDraft({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      const players = await lookupPlayers({
        client: browserClient(),
        body: { ids: data.configuration.cofounderIds },
        throwOnError: true,
      });
      const currentResponse =
        data.stateId === null
          ? null
          : await getOwnedState({
              client: browserClient(),
              path: { id: data.stateId },
              query: { locale },
              throwOnError: true,
            });
      const currentState = currentResponse?.data ?? null;
      return { draft: data, players: players.data.items, currentState };
    },
    retry: false,
  });
  if (query.isPending) {
    return <p>{uiText(locale, 'Загрузка черновика…', 'Loading draft…')}</p>;
  }
  if (query.isError) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  if (query.data.draft.submittedStateId !== null) {
    return (
      <ActionLink href={`/app/states/${query.data.draft.submittedStateId}`}>
        {uiText(locale, 'Черновик опубликован. Открыть государство', 'Draft published. Open state')}
      </ActionLink>
    );
  }
  return (
    <DraftEditor
      key={query.data.draft.id}
      initial={query.data.draft}
      principal={principal}
      players={query.data.players}
      currentState={query.data.currentState}
    />
  );
}

export { StateDraftPage };
