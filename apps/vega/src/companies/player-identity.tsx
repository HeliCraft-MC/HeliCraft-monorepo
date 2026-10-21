import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getPublicPlayerProfile } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { PlayerNickname } from '../player-nickname';

function CompanyPlayerIdentity({ id }: Readonly<{ id: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['public-player-preview', id],
    queryFn: async () => {
      const result = await getPublicPlayerProfile({
        client: createClient({ credentials: 'omit' }),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return query.data === undefined ? (
    <span>{uiText(locale, 'Игрок недоступен', 'Player unavailable')}</span>
  ) : (
    <PlayerNickname id={id} name={query.data.name} skinId={query.data.skinId} />
  );
}
export { CompanyPlayerIdentity };
