import type { ReactElement } from 'react';
import { MinecraftAvatar } from '../MinecraftAvatar/minecraft-avatar';
import styles from './player-nickname.module.scss';

interface PlayerNicknameProps {
  readonly name: string;
  readonly headUrl?: string;
  readonly size?: number;
  readonly href?: string;
}
function PlayerNickname({ name, headUrl, size = 24, href }: PlayerNicknameProps): ReactElement {
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
    <a className={styles.nickname} href={href}>
      {content}
    </a>
  );
}
export { PlayerNickname, type PlayerNicknameProps };
