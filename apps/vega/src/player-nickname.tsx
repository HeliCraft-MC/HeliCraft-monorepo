import type { ReactElement } from 'react';
import { PlayerNickname as Nickname } from '@helicraft/atria';

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
  const version = skinId === undefined ? '' : `?v=${skinId ?? 'default'}`;
  return (
    <Nickname
      name={name}
      size={size}
      headUrl={`/api/v1/public/players/${id}/avatar.png${version}`}
      href={linked ? `/players/${id}` : undefined}
    />
  );
}
export { PlayerNickname };
