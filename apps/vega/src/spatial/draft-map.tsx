import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPoliticalMap } from '@helicraft/alhena';
import type { SpatialWorld, TerritoryDraft } from '@helicraft/alhena';
import { Alert, LoadingState } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { TerritoryEditor } from './editor';

function DraftMap({
  draft,
  world,
  onSaved,
}: Readonly<{
  draft: TerritoryDraft;
  world: SpatialWorld;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['territory-edit-map', world.id],
    queryFn: async () => {
      const result = await getPoliticalMap({
        client: browserClient(),
        path: { id: world.id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  if (!query.data) {
    return query.isPending ? (
      <LoadingState
        label={uiText(locale, 'Загрузка утверждённых границ…', 'Loading ratified boundaries…')}
      />
    ) : (
      <Alert tone="danger">{errorMessage(query.error)}</Alert>
    );
  }
  return (
    <TerritoryEditor
      key={`${draft.id}:${draft.sealedAt ?? ''}`}
      initial={draft}
      world={world}
      territories={query.data.territories}
      onSaved={onSaved}
    />
  );
}
export { DraftMap };
