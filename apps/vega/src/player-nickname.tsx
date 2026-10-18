import { useSiteBranding } from './site-branding';
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getPublicPlayerProfile } from '@helicraft/alhena';
import { useTranslation } from './i18n';
import { uiText } from './states/text';
import { formatDate } from './date-format';
import type { ReactElement } from 'react';
import { PlayerNickname as Nickname } from '@helicraft/atria';

const PREVIEW_STALE_MS = 60_000;
function PlayerNickname({
  id,
  name,
  size = 24,
  skinId,
  linked = true,
}: Readonly<{
  id: string;
  name: string;
  size?: number;
  skinId?: string | null;
  linked?: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const { serverName } = useSiteBranding();
  const [requested, setRequested] = useState(false);
  const requestPreview = useCallback((): void => {
    setRequested(true);
  }, []);
  const profile = useQuery({
    queryKey: ['public-player-preview', id],
    staleTime: PREVIEW_STALE_MS,
    retry: false,
    enabled: requested && linked,
    queryFn: async () => {
      const result = await getPublicPlayerProfile({
        client: createClient({ credentials: 'omit' }),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const preview = useMemo(
    () => ({
      title: name,
      description:
        profile.data === undefined
          ? uiText(locale, 'Открыть профиль игрока', 'Open player profile')
          : `${uiText(locale, `На ${serverName} с`, `Joined ${serverName} on`)} ${formatDate(profile.data.registeredAt, locale)}`,
      facts:
        profile.data === undefined
          ? undefined
          : `${uiText(locale, 'Гражданства', 'Citizenships')}: ${profile.data.states.filter((state) => state.citizenSince !== null).length} · ${uiText(locale, 'Должности', 'Offices')}: ${profile.data.states.reduce((total, state) => total + state.offices.length, 0)}`,
    }),
    [name, profile.data, locale, serverName],
  );
  const version = skinId === undefined ? '' : `?v=${skinId ?? 'default'}`;
  return (
    <Nickname
      name={name}
      preview={preview}
      onPreview={requestPreview}
      size={size}
      headUrl={`/api/v1/public/players/${id}/avatar.png${version}`}
      href={linked ? `/players/${id}` : undefined}
    />
  );
}
export { PlayerNickname };
