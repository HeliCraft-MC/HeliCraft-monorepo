import { PlayerNickname } from './player-nickname';
import { localizeGallery } from './localized-content';
import { GalleryMetadataEditor } from './gallery-metadata-editor';
import { Icon } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { GalleryOwnerActions } from './gallery-owner-actions';
import styles from './gallery.module.scss';

const route = getRouteApi('/gallery/$id');
function GalleryDetail(): ReactElement {
  const { text, locale } = useTranslation();

  const { item: original } = route.useLoaderData();
  const item = original ? localizeGallery(original, locale) : null;
  if (!item) {
    return <main id="main-content">{text('gallery.photoUnavailable')}</main>;
  }
  return (
    <main id="main-content" className={styles.page}>
      <a className={styles.back} href="/gallery">
        <Icon name="arrowLeft" /> {text('gallery.allPhotos')}
      </a>
      <div className={styles.detailHeading}>
        <h1>{item.title}</h1>
      </div>
      <figure className={styles.detailImage}>
        <img
          src={item.imageUrl}
          srcSet={`${item.thumbnailUrl} 800w, ${item.imageUrl} 2560w`}
          sizes="90vw"
          alt={item.alt}
          width={item.width}
          height={item.height}
          fetchPriority="high"
        />
      </figure>
      <div className={styles.details}>
        <div>
          {item.description !== '' && <p className={styles.description}>{item.description}</p>}
          {item.place !== '' && <p>{item.place}</p>}
          <GalleryOwnerActions id={item.id} ownerId={item.author.id} />
          {original && <GalleryMetadataEditor item={original} />}
        </div>
        <dl>
          <dt>{text('common.author')}</dt>
          <dd>
            <PlayerNickname id={item.author.id} name={item.author.name} />
          </dd>
          <dt>{text('common.publishedAt')}</dt>
          <dd>
            <time dateTime={item.createdAt}>
              {new Date(item.createdAt).toLocaleDateString(locale, { timeZone: 'UTC' })}
            </time>
          </dd>
          {item.location && (
            <>
              <dt>{text('gallery.location')}</dt>
              <dd>
                {item.location.x}, {item.location.y}, {item.location.z} · {item.location.dimension}
              </dd>
            </>
          )}
          {item.players.length > 0 && (
            <>
              <dt>{text('gallery.players')}</dt>
              <dd>
                <ul className={styles.people}>
                  {item.players.map((player) => (
                    <li key={player.id}>
                      <PlayerNickname id={player.id} name={player.name} size={28} />
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          )}
        </dl>
      </div>
    </main>
  );
}
export { GalleryDetail };
