import { PlayerNickname } from '../PlayerNickname/player-nickname';
import { Icon } from '../icon';
import type { ReactElement } from 'react';
import styles from './gallery-tile.module.scss';

interface GalleryTileProps {
  readonly href: string;
  readonly image: string;
  readonly alt: string;
  readonly title: string;
  readonly author: string;
  readonly authorHeadUrl?: string;
  readonly authorHref?: string;
  readonly date: string;
  readonly width: number;
  readonly height: number;
}
function GalleryTile({
  href,
  image,
  alt,
  title,
  author,
  authorHeadUrl,
  authorHref,
  date,
  width,
  height,
}: GalleryTileProps): ReactElement {
  return (
    <article className={styles.tile}>
      <a href={href}>
        <div className={styles.image}>
          <img src={image} alt={alt} width={width} height={height} loading="lazy" />
        </div>
        <div className={styles.caption}>
          <h2>{title}</h2>
          <Icon name="arrowUpRight" />
        </div>
      </a>
      <p>
        <PlayerNickname name={author} headUrl={authorHeadUrl} href={authorHref} />{' '}
        <span aria-hidden="true">·</span>{' '}
        <time dateTime={date}>
          {new Date(date).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}
        </time>
      </p>
    </article>
  );
}
export { GalleryTile, type GalleryTileProps };
