import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import type { TerritoryDecisionDisplay } from '@helicraft/alhena';
import { getPoliticalMap, listSpatialWorlds } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { PoliticalMap } from './map-view';
import { TerritoryAnalysis } from './analysis';
import { DEFAULT_NATIVE_ZOOM, geometryCenter } from './model';
import { useMemo } from 'react';

function TerritoryDecisionContent({
  display,
}: Readonly<{ display: TerritoryDecisionDisplay }>): ReactElement {
  const { locale } = useTranslation();
  const { draft, analysis } = display;
  const center = useMemo(() => geometryCenter(draft.geometry), [draft.geometry]);
  const query = useQuery({
    queryKey: ['territory-decision-map', draft.worldId],
    queryFn: async () => {
      const client = browserClient();
      const [worlds, map] = await Promise.all([
        listSpatialWorlds({ client, throwOnError: true }),
        getPoliticalMap({ client, path: { id: draft.worldId }, throwOnError: true }),
      ]);
      return {
        world: worlds.data.items.find((item) => item.id === draft.worldId),
        territories: map.data.territories,
      };
    },
  });
  return (
    <section>
      <h3>
        {uiText(locale, 'Зафиксированное территориальное предложение', 'Frozen territory proposal')}
      </h3>
      <p>{displayText(draft.reason, locale)}</p>
      <p>
        {uiText(locale, 'Мир', 'World')}: {draft.worldId} ·{' '}
        {uiText(locale, 'Базовая ревизия', 'Base revision')}: {draft.baseRevisionId ?? '—'}
      </p>
      <TerritoryAnalysis analysis={analysis} />
      {query.data?.world && (
        <PoliticalMap
          world={query.data.world}
          territories={query.data.territories}
          geometry={draft.geometry}
          center={center}
          zoom={query.data.world.maxZoom ?? DEFAULT_NATIVE_ZOOM}
        />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      <p>
        {uiText(
          locale,
          'Решение относится именно к этой геометрии. После завершения государственной процедуры требуется отдельная административная ратификация.',
          'This decision binds this exact geometry. Completion of the state procedure still requires separate administrative ratification.',
        )}
      </p>
    </section>
  );
}
export { TerritoryDecisionContent };
