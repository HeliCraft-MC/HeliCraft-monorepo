import type { ReactElement } from 'react';
import { EntityLink } from './entity-link';
import type { EntityPreviewProps } from './entity-preview';
import { MinecraftAvatar } from '../MinecraftAvatar/minecraft-avatar';
import styles from './player-nickname.module.scss';

interface PlayerNicknameProps {
  readonly preview?: EntityPreviewProps;
  readonly onPreview?: () => void;
  readonly name: string;
  readonly headUrl?: string;
  readonly size?: number;
  readonly href?: string;
}
function PlayerNickname({
  name,
  headUrl,
  size = 24,
  href,
  preview,
  onPreview,
}: PlayerNicknameProps): ReactElement {
  const content = (
    <>
      <span aria-hidden="true">
        <MinecraftAvatar name={name} src={headUrl} size={size} />
      </span>
      <span>{name}</span>
    </>
  );
  return href === undefined ? (
    <span className={styles.nickname}>{content}</span>
  ) : (
    <EntityLink href={href} name={name} preview={preview} onPreview={onPreview}>
      {content}
    </EntityLink>
  );
}
export { PlayerNickname, type PlayerNicknameProps };
