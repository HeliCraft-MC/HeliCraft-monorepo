import { useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getPublicState } from '@helicraft/alhena';
import { StateName as Name } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { displayText, uiText } from './states/text';

const PREVIEW_STALE_MS = 60_000;
function StateName({
  name,
  href,
  color,
  slug,
  facts,
}: Readonly<{
  name: string;
  href: string;
  color: string;
  slug: string;
  facts?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  const [requested, setRequested] = useState(false);
  const requestPreview = useCallback((): void => {
    setRequested(true);
  }, []);
  const state = useQuery({
    queryKey: ['public-state-preview', slug, locale],
    enabled: requested,
    staleTime: PREVIEW_STALE_MS,
    retry: false,
    queryFn: async () => {
      const result = await getPublicState({
        client: createClient({ credentials: 'omit' }),
        path: { slug },
        query: { locale },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const publicFacts =
    state.data === undefined
      ? undefined
      : `${uiText(locale, 'Граждане', 'Citizens')}: ${state.data.citizens.length} · ${uiText(locale, 'Должности', 'Offices')}: ${state.data.configuration.governance.offices.length}`;
  return (
    <Name
      name={name}
      href={href}
      color={color}
      onPreview={requestPreview}
      description={
        state.data === undefined
          ? uiText(locale, 'Открыть государство', 'Open state')
          : displayText(state.data.configuration.description, locale)
      }
      facts={[publicFacts, facts]
        .filter((value) => value !== undefined && value !== '')
        .join(' · ')}
    />
  );
}
export { StateName };
