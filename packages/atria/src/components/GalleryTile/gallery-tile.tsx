import { Icon } from '../icon';
import type { ReactElement } from 'react';
import styles from './gallery-tile.module.scss';

interface GalleryTileProps {
  readonly href: string;
  readonly image: string;
  readonly alt: string;
  readonly title: string;
  readonly author: string;
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
  date,
  width,
  height,
}: GalleryTileProps): ReactElement {
  return (
    <a className={styles.tile} href={href}>
      <div className={styles.image}>
        <img src={image} alt={alt} width={width} height={height} loading="lazy" />
      </div>
      <div className={styles.caption}>
        <h2>{title}</h2>
        <Icon name="arrowUpRight" />
      </div>
      <p>
        {author} <span aria-hidden="true">·</span>{' '}
        <time dateTime={date}>
          {new Date(date).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}
        </time>
      </p>
    </a>
  );
}
export { GalleryTile, type GalleryTileProps };
