import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getPublicPlayerProfile } from '@helicraft/alhena';
import { PlayerNickname } from '../player-nickname';

const PROFILE_STALE_MS = 60_000;
function MonetaryPlayer({ id }: Readonly<{ id: string }>): ReactElement {
  const profile = useQuery({
    queryKey: ['public-player-preview', id],
    staleTime: PROFILE_STALE_MS,
    retry: false,
    queryFn: async () => {
      const result = await getPublicPlayerProfile({
        client: createClient({ credentials: 'omit' }),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return <PlayerNickname id={id} name={profile.data?.name ?? id} skinId={profile.data?.skinId} />;
}
export { MonetaryPlayer };
