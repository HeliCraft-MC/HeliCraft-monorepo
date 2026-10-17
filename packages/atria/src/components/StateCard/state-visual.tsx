import { Icon } from '../icon';
import type { ReactElement } from 'react';
import type { StateCardProps } from './state-card';
import styles from './state-card.module.scss';

function StateVisual({
  name,
  flag,
  image,
  silhouette,
  flagLabel,
}: Pick<StateCardProps, 'name' | 'flag' | 'image' | 'silhouette' | 'flagLabel'>): ReactElement {
  return (
    <div className={styles.visual} data-symbol-only={flag === null || undefined}>
      {typeof flag === 'string' ? (
        <>
          {image !== undefined && image !== '' ? (
            <img src={image} alt="" loading="lazy" width="800" height="500" />
          ) : (
            <div className={styles.territory} aria-hidden="true">
              {silhouette !== undefined && silhouette !== '' ? (
                <img src={silhouette} alt="" />
              ) : (
                <Icon name="map" size={80} />
              )}
            </div>
          )}
          <img
            className={styles.flag}
            src={flag}
            alt={`${flagLabel}: ${name}`}
            width="72"
            height="48"
          />
        </>
      ) : (
        <div className={styles.flagArtwork}>
          {flag ?? <span aria-hidden="true">{name.slice(0, 1)}</span>}
        </div>
      )}
    </div>
  );
}

export { StateVisual };
